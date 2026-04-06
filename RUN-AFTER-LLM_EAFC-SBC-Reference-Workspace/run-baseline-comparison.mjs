import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const usage = `
Run the operator-side comparison against the stored baseline report.

Usage:
  node run-baseline-comparison.mjs [--workspace-root <dir>] [--report <file>] [--json <file>] [--md <file>]
`;

const PENALTY_SCALES = {
  ratingExcess: 5,
  maxRating: 5,
  highRatingScore: 3000,
  highRatingCount: 5,
  identityBalancePenalty: 10,
  sumRating: 60,
  specialCount: 3,
  tradableCount: 3,
  scarcityPenalty: 2000,
};

const PENALTY_KEYS = Object.keys(PENALTY_SCALES);

const parseArgs = (argv) => {
  const args = {
    workspaceRoot: null,
    report: null,
    json: null,
    md: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--workspace-root") {
      args.workspaceRoot = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--report") {
      args.report = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--json") {
      args.json = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--md") {
      args.md = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return args;
};

const readJson = async (filePath) => {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
};

const roundTo = (value, decimals = 6) => {
  if (!Number.isFinite(value)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const meanOrNull = (values) => {
  const numbers = (values || []).filter((value) => Number.isFinite(value));
  if (!numbers.length) return null;
  return roundTo(
    numbers.reduce((sum, value) => sum + value, 0) / numbers.length,
    6,
  );
};

const formatSigned = (value, digits = 6) => {
  if (!Number.isFinite(value)) return "n/a";
  const rounded = Number(value.toFixed(digits));
  return rounded > 0 ? `+${rounded}` : String(rounded);
};

const toFiniteNumber = (value, fallback = null) =>
  Number.isFinite(value) ? value : fallback;

const compareToReference = (candidateRow, referenceRow) => {
  const mutualSolved = Boolean(candidateRow?.solved && referenceRow?.solved);
  const averageRatingDeltaVsReference = mutualSolved
    ? roundTo(
        (toFiniteNumber(candidateRow?.stats?.averageRating, 0) || 0) -
          (toFiniteNumber(referenceRow?.stats?.averageRating, 0) || 0),
        6,
      )
    : null;

  const penaltyDeltaVsReference = {};
  for (const key of PENALTY_KEYS) {
    penaltyDeltaVsReference[key] = mutualSolved
      ? roundTo(
          (toFiniteNumber(candidateRow?.stats?.solvedValue?.[key], 0) || 0) -
            (toFiniteNumber(referenceRow?.stats?.solvedValue?.[key], 0) || 0),
          6,
        )
      : null;
  }

  return {
    mutualSolved,
    averageRatingDeltaVsReference,
    penaltyDeltaVsReference,
  };
};

const buildScoreBreakdown = ({
  solvedCount,
  referenceSolvedCount,
  meanAverageRatingDeltaVsReference,
  mutualSolvedCount,
  penaltyDeltaMeans,
}) => {
  const safeReferenceSolvedCount =
    Number.isFinite(referenceSolvedCount) && referenceSolvedCount > 0
      ? referenceSolvedCount
      : 1;

  const coverageScore =
    80 *
    clamp((toFiniteNumber(solvedCount, 0) || 0) / safeReferenceSolvedCount, 0, 1);

  const ratingScore =
    mutualSolvedCount > 0 && Number.isFinite(meanAverageRatingDeltaVsReference)
      ? 10 * (1 - clamp(Math.max(0, meanAverageRatingDeltaVsReference) / 5, 0, 1))
      : 0;

  const normalizedPenaltyLosses = PENALTY_KEYS.map((key) => {
    const delta = toFiniteNumber(penaltyDeltaMeans?.[key], 0) || 0;
    return clamp(Math.max(0, delta) / PENALTY_SCALES[key], 0, 1);
  });

  const averagePenaltyLoss =
    normalizedPenaltyLosses.length > 0
      ? normalizedPenaltyLosses.reduce((sum, value) => sum + value, 0) /
        normalizedPenaltyLosses.length
      : 1;

  const spendDisciplineScore = 10 * (1 - averagePenaltyLoss);
  const overallScore = clamp(
    coverageScore + ratingScore + spendDisciplineScore,
    0,
    100,
  );

  return {
    overallScore: Number(overallScore.toFixed(2)),
    coverageScore: Number(coverageScore.toFixed(2)),
    ratingScore: Number(ratingScore.toFixed(2)),
    spendDisciplineScore: Number(spendDisciplineScore.toFixed(2)),
    formula: {
      overall: "coverageScore + ratingScore + spendDisciplineScore",
      coverageScore: "80 * min(candidateSolvedCount / referenceSolvedCount, 1)",
      ratingScore:
        "10 * (1 - clamp(max(0, meanAverageRatingDeltaVsReference) / 5, 0, 1))",
      spendDisciplineScore:
        "10 * (1 - average(clamped positive penalty deltas across the evaluation penalty metrics))",
      notes: {
        overallScore: "higher is better; stored baseline is 100",
        coverageScore: "higher is better; max 80",
        ratingScore:
          "higher is better; max 10; a positive average rating delta lowers the score",
        spendDisciplineScore:
          "higher is better; max 10; worse penalty deltas lower the score",
      },
      penaltyScales: PENALTY_SCALES,
    },
  };
};

const buildReferenceComparison = (candidateReport, referenceReport) => {
  const candidateRows = Array.isArray(candidateReport?.results)
    ? candidateReport.results
    : [];
  const referenceRows = Array.isArray(referenceReport?.results)
    ? referenceReport.results
    : [];
  const referenceIndex = new Map(
    referenceRows
      .filter((row) => row?.challengeId != null)
      .map((row) => [String(row.challengeId), row]),
  );

  const solvedByBoth = [];
  const referenceOnly = [];
  const candidateOnly = [];
  const solvedByNeither = [];
  const comparisonRows = [];

  for (const row of candidateRows) {
    const referenceRow =
      row?.challengeId == null
        ? null
        : referenceIndex.get(String(row.challengeId)) || null;
    const comparison = compareToReference(row, referenceRow);
    comparisonRows.push({ row, referenceRow, comparison });

    const candidateSolved = Boolean(row?.solved);
    const referenceSolved = Boolean(referenceRow?.solved);
    const entry = {
      challengeId: row?.challengeId ?? null,
      challengeName: row?.challengeName ?? null,
    };

    if (candidateSolved && referenceSolved) solvedByBoth.push(entry);
    else if (!candidateSolved && referenceSolved) referenceOnly.push(entry);
    else if (candidateSolved && !referenceSolved) candidateOnly.push(entry);
    else solvedByNeither.push(entry);
  }

  const referenceSolvedCount =
    toFiniteNumber(referenceReport?.summary?.solvedCount, null) ??
    referenceRows.filter((row) => row?.solved).length;
  const challengeCount =
    toFiniteNumber(candidateReport?.summary?.challengeCount, null) ??
    toFiniteNumber(candidateReport?.evaluation?.challengeCount, null) ??
    candidateRows.length;
  const solvedCount =
    toFiniteNumber(candidateReport?.summary?.solvedCount, null) ??
    candidateRows.filter((row) => row?.solved).length;
  const mutualSolvedCount = solvedByBoth.length;
  const meanAverageRatingDeltaVsReference = meanOrNull(
    comparisonRows.map((entry) => entry.comparison.averageRatingDeltaVsReference),
  );
  const penaltyDeltaMeans = Object.fromEntries(
    PENALTY_KEYS.map((key) => [
      key,
      meanOrNull(
        comparisonRows.map(
          (entry) => entry.comparison.penaltyDeltaVsReference?.[key],
        ),
      ),
    ]),
  );
  const solveGap = Number.isFinite(referenceSolvedCount)
    ? referenceSolvedCount - solvedCount
    : null;
  const scoreBreakdown = buildScoreBreakdown({
    solvedCount,
    referenceSolvedCount,
    meanAverageRatingDeltaVsReference,
    mutualSolvedCount,
    penaltyDeltaMeans,
  });

  return {
    version: "eafc-sbc-baseline-comparison-v1",
    generatedAt: new Date().toISOString(),
    candidate: {
      path: candidateReport?.evaluation?.candidatePath ?? null,
    },
    headline: {
      challengeCount,
      candidateSolvedCount: solvedCount,
      referenceSolvedCount,
      solveGap,
      mutualSolvedCount,
      meanAverageRatingDeltaVsReference,
      overallScore: scoreBreakdown.overallScore,
      notes: {
        overallScore: "higher is better; stored baseline is 100",
        solvedCount: "higher is better",
        solveGap: "lower is better",
        meanAverageRatingDeltaVsReference:
          "lower is better; negative means the candidate used a lower average rating than the reference",
        penaltyDeltaMeans:
          "lower is better; negative means the candidate used less of that penalty metric than the reference",
      },
    },
    scoreBreakdown,
    penaltyDeltaMeans,
    missedChallenges: referenceOnly,
    candidateOnlyWins: candidateOnly,
  };
};

const buildMarkdown = (finalReport) => {
  const visiblePenaltyKeys = [
    "ratingExcess",
    "highRatingScore",
    "specialCount",
    "tradableCount",
    "scarcityPenalty",
  ];

  const lines = [];
  lines.push("# Baseline Comparison");
  lines.push("");
  lines.push(
    `- Overall score: \`${finalReport.headline.overallScore} / 100\` (higher is better; stored baseline is 100)`,
  );
  lines.push(
    `- Candidate solved: \`${finalReport.headline.candidateSolvedCount} / ${finalReport.headline.challengeCount}\` (higher is better)`,
  );
  lines.push(
    `- Baseline solved: \`${finalReport.headline.referenceSolvedCount} / ${finalReport.headline.challengeCount}\` (higher is better)`,
  );
  lines.push(
    `- Solve gap: \`${finalReport.headline.solveGap}\` (lower is better)`,
  );
  lines.push(`- Mutually solved: \`${finalReport.headline.mutualSolvedCount}\``);
  lines.push(
    `- Average rating delta vs baseline: \`${formatSigned(finalReport.headline.meanAverageRatingDeltaVsReference)}\` (lower is better; negative is better than baseline)`,
  );
  lines.push("");
  lines.push("## Score Breakdown");
  lines.push("");
  lines.push(
    `- Coverage score: \`${finalReport.scoreBreakdown.coverageScore} / 80\` (higher is better)`,
  );
  lines.push(
    `- Rating score: \`${finalReport.scoreBreakdown.ratingScore} / 10\` (higher is better)`,
  );
  lines.push(
    `- Spend discipline score: \`${finalReport.scoreBreakdown.spendDisciplineScore} / 10\` (higher is better)`,
  );
  lines.push("");
  lines.push("## Penalty Deltas");
  lines.push("");
  for (const key of visiblePenaltyKeys) {
    lines.push(
      `- \`${key}\`: \`${formatSigned(finalReport.penaltyDeltaMeans?.[key])}\` (lower is better)`,
    );
  }
  lines.push("- Full penalty deltas are available in `baseline-comparison.json`");
  lines.push("");

  if ((finalReport.missedChallenges || []).length > 0) {
    lines.push("## Missed Challenges");
    lines.push("");
    const visible = finalReport.missedChallenges.slice(0, 25);
    for (const row of visible) {
      lines.push(`- \`${row.challengeId}\` ${row.challengeName}`);
    }
    if (finalReport.missedChallenges.length > visible.length) {
      lines.push(
        `- and ${finalReport.missedChallenges.length - visible.length} more`,
      );
    }
    lines.push("");
  }

  if ((finalReport.candidateOnlyWins || []).length > 0) {
    lines.push("## Candidate-Only Wins");
    lines.push("");
    for (const row of finalReport.candidateOnlyWins) {
      lines.push(`- \`${row.challengeId}\` ${row.challengeName}`);
    }
    lines.push("");
  }

  return lines.join("\n");
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage.trim());
    return;
  }

  const workspaceRoot = path.resolve(
    __dirname,
    args.workspaceRoot ?? "..",
    "OPEN-IN-LLM_EAFC-SBC-Solver-Workspace",
  );
  const reportPath = path.resolve(
    args.report ?? path.join(workspaceRoot, "candidate", "report.json"),
  );
  const jsonPath = path.resolve(
    args.json ?? path.join(__dirname, "output", "baseline-comparison.json"),
  );
  const mdPath = path.resolve(
    args.md ?? path.join(__dirname, "output", "baseline-comparison.md"),
  );
  const referencePath = path.resolve(__dirname, "baseline-report.json");

  const candidateReport = await readJson(reportPath);
  const referenceReport = await readJson(referencePath);
  const finalReport = buildReferenceComparison(candidateReport, referenceReport);
  const finalMarkdown = buildMarkdown(finalReport);

  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.mkdir(path.dirname(mdPath), { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(finalReport, null, 2), "utf8");
  await fs.writeFile(mdPath, finalMarkdown, "utf8");

  console.log(
    JSON.stringify(
      {
        report: reportPath,
        json: jsonPath,
        md: mdPath,
      },
      null,
      2,
    ),
  );
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});

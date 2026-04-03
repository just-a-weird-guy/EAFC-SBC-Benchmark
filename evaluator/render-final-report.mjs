import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const usage = `
Render a compact final comparison report from a generated benchmark report.

Usage:
  node evaluator/render-final-report.mjs --report <file> [--json <file>] [--md <file>]
`;

const parseArgs = (argv) => {
  const args = { report: null, json: null, md: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localPath = (...segments) => path.resolve(__dirname, ...segments);

const toNumber = (value) => (Number.isFinite(value) ? value : null);

const formatSigned = (value, digits = 6) => {
  if (!Number.isFinite(value)) return "n/a";
  const rounded = Number(value.toFixed(digits));
  return rounded > 0 ? `+${rounded}` : String(rounded);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

const toFiniteNumber = (value, fallback = null) =>
  Number.isFinite(value) ? value : fallback;

const buildScoreBreakdown = ({
  solvedCount,
  baselineSolvedCount,
  meanAverageRatingDeltaVsBaseline,
  mutualSolvedCount,
  penaltyDeltaMeans,
}) => {
  const safeBaselineSolvedCount =
    Number.isFinite(baselineSolvedCount) && baselineSolvedCount > 0
      ? baselineSolvedCount
      : 1;

  const coverageScore =
    80 * clamp((toFiniteNumber(solvedCount, 0) || 0) / safeBaselineSolvedCount, 0, 1);

  const ratingScore =
    mutualSolvedCount > 0 && Number.isFinite(meanAverageRatingDeltaVsBaseline)
      ? 10 * (1 - clamp(Math.max(0, meanAverageRatingDeltaVsBaseline) / 5, 0, 1))
      : 0;

  const penaltyKeys = Object.keys(PENALTY_SCALES);
  const normalizedPenaltyLosses = penaltyKeys.map((key) => {
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
      coverageScore: "80 * min(candidateSolvedCount / baselineSolvedCount, 1)",
      ratingScore:
        "10 * (1 - clamp(max(0, meanAverageRatingDeltaVsBaseline) / 5, 0, 1))",
      spendDisciplineScore:
        "10 * (1 - average(clamped positive penalty deltas across the benchmark penalty metrics))",
      notes: {
        overallScore: "higher is better; baseline is 100",
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

const buildFinalComparison = (report, baselineReference) => {
  const rows = Array.isArray(report?.results) ? report.results : [];
  const baselineSolvedCount =
    toNumber(baselineReference?.summary?.solvedCount) ??
    rows.filter((row) => row?.baseline?.solved).length;
  const challengeCount =
    toNumber(report?.summary?.challengeCount) ??
    toNumber(report?.benchmark?.challengeCount) ??
    rows.length;

  const solvedByBoth = [];
  const baselineOnly = [];
  const candidateOnly = [];
  const solvedByNeither = [];

  for (const row of rows) {
    const candidateSolved = Boolean(row?.solved);
    const baselineSolved = Boolean(row?.baseline?.solved);
    const entry = {
      challengeId: row?.challengeId ?? null,
      challengeName: row?.challengeName ?? null,
    };
    if (candidateSolved && baselineSolved) {
      solvedByBoth.push(entry);
    } else if (!candidateSolved && baselineSolved) {
      baselineOnly.push(entry);
    } else if (candidateSolved && !baselineSolved) {
      candidateOnly.push(entry);
    } else {
      solvedByNeither.push(entry);
    }
  }

  const penaltyDeltaMeans = report?.summary?.penaltyDeltaMeans ?? {};
  const meanAverageRatingDeltaVsBaseline =
    report?.summary?.meanAverageRatingDeltaVsBaseline ?? null;
  const solvedCount = toNumber(report?.summary?.solvedCount) ?? 0;
  const solveGap = Number.isFinite(baselineSolvedCount)
    ? baselineSolvedCount - solvedCount
    : null;
  const mutualSolvedCount =
    toNumber(report?.summary?.mutualSolvedCountWithBaseline) ?? solvedByBoth.length;
  const scoreBreakdown = buildScoreBreakdown({
    solvedCount,
    baselineSolvedCount,
    meanAverageRatingDeltaVsBaseline,
    mutualSolvedCount,
    penaltyDeltaMeans,
  });

  return {
    version: "eafc-sbc-benchmark-final-report-v1",
    generatedAt: new Date().toISOString(),
    candidate: {
      path: report?.benchmark?.candidatePath ?? null,
    },
    headline: {
      challengeCount,
      candidateSolvedCount: solvedCount,
      baselineSolvedCount,
      solveGap,
      mutualSolvedCount,
      meanAverageRatingDeltaVsBaseline,
      overallScore: scoreBreakdown.overallScore,
      notes: {
        overallScore: "higher is better; baseline is 100",
        solvedCount: "higher is better",
        solveGap: "lower is better",
        meanAverageRatingDeltaVsBaseline:
          "lower is better; negative means the candidate used a lower average rating than the baseline",
        penaltyDeltaMeans:
          "lower is better; negative means the candidate used less of that penalty metric than the baseline",
      },
    },
    scoreBreakdown,
    penaltyDeltaMeans,
    missedChallenges: baselineOnly,
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
  lines.push("# Final Comparison");
  lines.push("");
  lines.push(`- Overall score: \`${finalReport.headline.overallScore} / 100\` (higher is better; baseline is 100)`);
  lines.push(`- Candidate solved: \`${finalReport.headline.candidateSolvedCount} / ${finalReport.headline.challengeCount}\` (higher is better)`);
  lines.push(`- Baseline solved: \`${finalReport.headline.baselineSolvedCount} / ${finalReport.headline.challengeCount}\` (higher is better)`);
  lines.push(`- Solve gap: \`${finalReport.headline.solveGap}\` (lower is better)`);
  lines.push(`- Mutually solved: \`${finalReport.headline.mutualSolvedCount}\``);
  lines.push(`- Average rating delta vs baseline: \`${formatSigned(finalReport.headline.meanAverageRatingDeltaVsBaseline)}\` (lower is better; negative is better than baseline)`);
  lines.push("");
  lines.push("## Score Breakdown");
  lines.push("");
  lines.push(`- Coverage score: \`${finalReport.scoreBreakdown.coverageScore} / 80\` (higher is better)`);
  lines.push(`- Rating score: \`${finalReport.scoreBreakdown.ratingScore} / 10\` (higher is better)`);
  lines.push(`- Spend discipline score: \`${finalReport.scoreBreakdown.spendDisciplineScore} / 10\` (higher is better)`);
  lines.push("");
  lines.push("## Penalty Deltas");
  lines.push("");
  for (const key of visiblePenaltyKeys) {
    const value = finalReport.penaltyDeltaMeans?.[key];
    lines.push(`- \`${key}\`: \`${formatSigned(value)}\` (lower is better)`);
  }
  lines.push("- Full penalty deltas are available in `final-comparison.json`");
  lines.push("");

  const missed = finalReport.missedChallenges || [];
  if (missed.length > 0) {
    lines.push("## Missed Challenges");
    lines.push("");
    const visible = missed.slice(0, 25);
    for (const row of visible) {
      lines.push(`- \`${row.challengeId}\` ${row.challengeName}`);
    }
    if (missed.length > visible.length) {
      lines.push(`- and ${missed.length - visible.length} more`);
    }
    lines.push("");
  }

  const wins = finalReport.candidateOnlyWins || [];
  if (wins.length > 0) {
    lines.push("## Candidate-Only Wins");
    lines.push("");
    for (const row of wins) {
      lines.push(`- \`${row.challengeId}\` ${row.challengeName}`);
    }
    lines.push("");
  }

  return lines.join("\n");
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage.trim());
    return;
  }
  if (!args.report) throw new Error("Missing --report <file>");

  const reportPath = path.resolve(args.report);
  const report = await readJson(reportPath);
  const baselineReference = await readJson(localPath("baseline-reference.json"));

  const outputDir = path.dirname(reportPath);
  const jsonPath = path.resolve(args.json ?? path.join(outputDir, "final-comparison.json"));
  const mdPath = path.resolve(args.md ?? path.join(outputDir, "final-comparison.md"));

  const finalReport = buildFinalComparison(report, baselineReference);
  const finalMarkdown = buildMarkdown(finalReport);

  await fs.writeFile(jsonPath, JSON.stringify(finalReport, null, 2), "utf8");
  await fs.writeFile(mdPath, finalMarkdown, "utf8");

  console.log(JSON.stringify({ json: jsonPath, md: mdPath }, null, 2));
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});

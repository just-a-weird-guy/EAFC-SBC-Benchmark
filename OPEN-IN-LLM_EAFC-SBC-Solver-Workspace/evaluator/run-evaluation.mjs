import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildEvaluatorContext,
  evaluateChallengeSolution,
} from "./lib/evaluator-core.mjs";

const usage = `
Run the evaluator against a Node.js candidate solver.

Usage:
  node evaluator/run-evaluation.mjs --candidate <file> [--report <file>] [--quiet]
`;

const parseArgs = (argv) => {
  const args = { candidate: null, report: null, help: false, quiet: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--quiet") {
      args.quiet = true;
      continue;
    }
    if (token === "--candidate") {
      args.candidate = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--report") {
      args.report = argv[index + 1] ?? null;
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

const localPath = (...segments) =>
  path.resolve(__dirname, ...segments);

const buildSummaryCounts = (rows, key) => {
  const counts = {};
  for (const row of rows || []) {
    for (const value of row?.[key] || []) {
      if (!value) continue;
      counts[value] = (counts[value] || 0) + 1;
    }
  }
  return counts;
};

const meanOrNull = (values, decimals = 2) => {
  const numbers = (values || []).filter((value) => Number.isFinite(value));
  if (!numbers.length) return null;
  return roundTo(
    numbers.reduce((sum, value) => sum + value, 0) / numbers.length,
    decimals,
  );
};

const roundTo = (value, decimals = 2) => {
  if (!Number.isFinite(value)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

const formatElapsed = (elapsedMs) => {
  const totalSeconds = Math.max(0, Math.floor((elapsedMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatProgressLine = ({
  index,
  total,
  solvedCount,
  unsolvedCount,
  elapsedMs,
  row,
}) => {
  const challengeLabel =
    row?.challengeName || row?.challengeId || `challenge ${index + 1}`;
  const status = row?.solved ? "solved" : "unsolved";
  const runtimeMs = row?.runtime?.elapsedMs ?? 0;
  return `[${index + 1}/${total}] ${status} | solved=${solvedCount} unsolved=${unsolvedCount} | elapsed=${formatElapsed(elapsedMs)} | last=${runtimeMs}ms | ${challengeLabel}`;
};

const buildSolvedValueMeans = (rows) => {
  const solvedRows = (rows || []).filter((row) => row?.solved && row?.stats?.solvedValue);
  const keys = [
    "ratingExcess",
    "maxRating",
    "highRatingScore",
    "highRatingCount",
    "identityBalancePenalty",
    "sumRating",
    "specialCount",
    "tradableCount",
    "scarcityPenalty",
    "informCount",
    "excessInforms",
    "excessSpecials",
  ];
  return Object.fromEntries(
    keys.map((key) => [
      key,
      meanOrNull(solvedRows.map((row) => row?.stats?.solvedValue?.[key]), 6),
    ]),
  );
};

const getSolverFunction = async (candidatePath) => {
  const candidateModule = await import(pathToFileURL(path.resolve(candidatePath)).href);
  return (
    candidateModule.solveChallenge ??
    candidateModule.default?.solveChallenge ??
    candidateModule.default
  );
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage.trim());
    return;
  }
  if (!args.candidate) throw new Error("Missing --candidate <file>");

  const playersPath = localPath("..", "model-kit", "datasets", "players-v1-flat.json");
  const challengesPath = localPath("..", "model-kit", "datasets", "challenges-v1.json");
  const rawPlayers = await readJson(playersPath);
  const rawChallenges = await readJson(challengesPath);

  const { players, challenges } = buildEvaluatorContext({
    rawPlayers,
    rawChallenges,
  });
  const solveChallenge = await getSolverFunction(args.candidate);
  if (typeof solveChallenge !== "function") {
    throw new Error("Candidate module must export solveChallenge(input) or a default function");
  }

  const rows = [];
  const evaluationStartedAt = Date.now();
  let solvedCount = 0;
  let unsolvedCount = 0;
  for (let index = 0; index < challenges.length; index += 1) {
    const challenge = challenges[index];
    const startedAt = Date.now();
    let candidateOutput = null;
    let runtimeError = null;
    try {
      candidateOutput = await solveChallenge({
        version: "eafc-sbc-solver-task-v1",
        challenge,
        players,
        metadata: {
          challengeIndex: index,
          challengeCount: challenges.length,
        },
      });
    } catch (error) {
      runtimeError = error?.message || String(error);
    }

    const row = evaluateChallengeSolution({
      challenge,
      playerPool: players,
      candidateOutput,
    });
    rows.push({
      ...row,
      runtime: {
        elapsedMs: Date.now() - startedAt,
        error: runtimeError,
      },
    });
    const completedRow = rows[rows.length - 1];
    if (completedRow.solved) solvedCount += 1;
    else unsolvedCount += 1;

    const progressLine = formatProgressLine({
      index,
      total: challenges.length,
      solvedCount,
      unsolvedCount,
      elapsedMs: Date.now() - evaluationStartedAt,
      row: completedRow,
    });
    if (process.stderr.isTTY) {
      process.stderr.write(`\r${progressLine}`);
      if (index === challenges.length - 1) process.stderr.write("\n");
    } else {
      process.stderr.write(`${progressLine}\n`);
    }
  }

  const solvedRows = rows.filter((row) => row.solved);
  const totalElapsedMs = Date.now() - evaluationStartedAt;
  const slowestChallenges = rows
    .slice()
    .sort(
      (a, b) =>
        (b?.runtime?.elapsedMs ?? 0) - (a?.runtime?.elapsedMs ?? 0),
    )
    .slice(0, 10)
    .map((row) => ({
      challengeId: row.challengeId,
      challengeName: row.challengeName,
      elapsedMs: row?.runtime?.elapsedMs ?? null,
      solved: row.solved,
    }));
  const summary = {
    challengeCount: rows.length,
    solvedCount: solvedRows.length,
    unsolvedCount: rows.length - solvedRows.length,
    solveRatePct: rows.length ? roundTo((solvedRows.length / rows.length) * 100, 2) : null,
    totalRuntimeMs: totalElapsedMs,
    meanRuntimeMs: meanOrNull(rows.map((row) => row?.runtime?.elapsedMs), 2),
    slowestChallenges,
    solvedValueMeans: buildSolvedValueMeans(rows),
    issueCounts: buildSummaryCounts(rows, "issues"),
    failingTypeCounts: buildSummaryCounts(rows, "failingTypes"),
  };
  const report = {
    generatedAt: new Date().toISOString(),
    evaluation: {
      version: "eafc-sbc-solver-task-v1",
      candidatePath: path.resolve(args.candidate),
      challengeCount: challenges.length,
      playersCount: players.length,
    },
    summary,
    results: rows,
  };

  if (args.report) {
    const reportPath = path.resolve(args.report);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
    if (args.quiet) {
      console.log(`Report written to ${reportPath}`);
    }
  }

  if (!args.quiet) {
    console.log(JSON.stringify(report, null, 2));
  }
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});

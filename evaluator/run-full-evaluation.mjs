import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const usage = `
Run the full benchmark flow for one candidate solver.

Usage:
  node evaluator/run-full-evaluation.mjs --candidate <file> [--report <file>] [--json <file>] [--md <file>]
`;

const parseArgs = (argv) => {
  const args = { candidate: null, report: null, json: null, md: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const runNodeScript = (scriptPath, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: rootDir,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });
  });

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage.trim());
    return;
  }
  if (!args.candidate) throw new Error("Missing --candidate <file>");

  const candidatePath = path.resolve(rootDir, args.candidate);
  const reportPath = path.resolve(rootDir, args.report ?? "candidate/report.json");
  const jsonPath = path.resolve(rootDir, args.json ?? "candidate/final-comparison.json");
  const mdPath = path.resolve(rootDir, args.md ?? "candidate/final-comparison.md");

  await runNodeScript(path.resolve(__dirname, "run-benchmark.mjs"), [
    "--candidate",
    candidatePath,
    "--report",
    reportPath,
    "--quiet",
  ]);

  await runNodeScript(path.resolve(__dirname, "render-final-report.mjs"), [
    "--report",
    reportPath,
    "--json",
    jsonPath,
    "--md",
    mdPath,
  ]);
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});

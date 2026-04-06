import path from "node:path";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const usage = `
Run the shipped baseline solver against the solver workspace and render the baseline comparison.

Usage:
  node baseline-solver/run-baseline-evaluation.mjs [--workspace-root <dir>]
`;

const parseArgs = (argv) => {
  const args = { workspaceRoot: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--workspace-root") {
      args.workspaceRoot = argv[index + 1] ?? null;
      index += 1;
    }
  }
  return args;
};

const runNodeScript = (scriptPath, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });
  });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const afterRunRoot = path.resolve(__dirname, "..");

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage.trim());
    return;
  }

  const workspaceRoot = path.resolve(
    afterRunRoot,
    args.workspaceRoot ?? "..",
    "OPEN-IN-LLM_EAFC-SBC-Solver-Workspace",
  );
  const candidatePath = path.resolve(__dirname, "task-solver.mjs");
  const outputDir = path.resolve(afterRunRoot, "output", "baseline-solver");
  const reportPath = path.join(outputDir, "report.json");
  const jsonPath = path.join(outputDir, "baseline-comparison.json");
  const mdPath = path.join(outputDir, "baseline-comparison.md");

  await fs.mkdir(outputDir, { recursive: true });

  await runNodeScript(
    path.resolve(workspaceRoot, "evaluator", "run-evaluation.mjs"),
    ["--candidate", candidatePath, "--report", reportPath, "--quiet"],
    workspaceRoot,
  );

  await runNodeScript(
    path.resolve(afterRunRoot, "run-baseline-comparison.mjs"),
    [
      "--workspace-root",
      workspaceRoot,
      "--report",
      reportPath,
      "--json",
      jsonPath,
      "--md",
      mdPath,
    ],
    afterRunRoot,
  );
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});

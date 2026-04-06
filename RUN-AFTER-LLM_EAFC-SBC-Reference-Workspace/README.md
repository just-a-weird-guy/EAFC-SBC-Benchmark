# Run After LLM

Use this folder after the tested model has finished.

Do not open this folder in the tested LLM.

## Compare With Baseline

If you want to compare the model-generated solver with the baseline solver, tell the same LLM:

```text
Stop working in OPEN-IN-LLM_EAFC-SBC-Solver-Workspace.
Scope out of that folder and open RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace instead.
Run `node run-baseline-comparison.mjs`.
Then read the generated comparison files in `output/` and report the key results back to the user, including solved count, solve gap, overall score, average rating delta vs baseline, and any missed challenges.
```

Why this split exists:
- the tested model needs the solver workspace, datasets, validator, and scorer
- the tested model should not receive the stored per-challenge baseline data
- this folder keeps the comparison step separate so opening the wrong root folder does not leak baseline profiles into the model-facing workspace
- candidate code is not executed here; this folder only reads the finished `candidate/report.json`

If your LLM app can access parent or sibling directories outside the folder you opened, move this entire folder elsewhere before testing a model.

What it does:
- reads `candidate/report.json` from the model-facing solver folder
- joins it with the stored baseline report
- writes the comparison output into this folder's `output/` directory by default
- includes a runnable baseline solver for operator-side verification

Default solver workspace:
- `../OPEN-IN-LLM_EAFC-SBC-Solver-Workspace`

Main command:

```bash
node run-baseline-comparison.mjs
```

Run baseline solver command:

```bash
node baseline-solver/run-baseline-evaluation.mjs
```

Explicit solver workspace path:

```bash
node run-baseline-comparison.mjs --workspace-root ../OPEN-IN-LLM_EAFC-SBC-Solver-Workspace
```

Default outputs:
- `output/baseline-comparison.json`
- `output/baseline-comparison.md`

If you want to write the final comparison somewhere else, pass `--json` and `--md`.

This folder contains the stored per-challenge baseline data.

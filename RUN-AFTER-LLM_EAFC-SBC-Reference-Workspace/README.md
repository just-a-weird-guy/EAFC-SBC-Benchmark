# Run After LLM

Use this folder after the tested model has finished.

Do not open this folder in the tested LLM.

Why this split exists:
- the tested model needs the solver workspace, datasets, validator, and scorer
- the tested model should not receive the stored per-challenge reference data
- this folder keeps the comparison step separate so opening the wrong root folder does not leak reference profiles into the model-facing workspace
- candidate code is not executed here; this folder only reads the finished `candidate/report.json`

If your LLM app can access parent or sibling directories outside the folder you opened, move this entire folder elsewhere before testing a model.

What it does:
- reads `candidate/report.json` from the model-facing solver folder
- joins it with the stored reference report
- writes the comparison output into this folder's `output/` directory by default
- includes a runnable reference solver for operator-side verification

Default solver workspace:
- `../OPEN-IN-LLM_EAFC-SBC-Solver-Workspace`

Main command:

```bash
node run-reference-comparison.mjs
```

Evaluate Reference solver command:

```bash
node reference-solver/run-reference-evaluation.mjs
```

Explicit solver workspace path:

```bash
node run-reference-comparison.mjs --workspace-root ../OPEN-IN-LLM_EAFC-SBC-Solver-Workspace
```

Default outputs:
- `output/reference-comparison.json`
- `output/reference-comparison.md`

If you want to write the final comparison somewhere else, pass `--json` and `--md`.

This folder contains the stored per-challenge reference data.

# Baseline Solver

This folder contains a runnable baseline solver used to produce the stored baseline report.

Do not open this folder in the tested LLM.

Main command:

```bash
node baseline-solver/run-baseline-evaluation.mjs
```

What it does:
- runs the baseline solver against the model-facing solver workspace
- writes the raw report to `../output/baseline-solver/report.json`
- renders the baseline comparison to `../output/baseline-solver/baseline-comparison.json`
- renders the human-readable summary to `../output/baseline-solver/baseline-comparison.md`

Default solver workspace:
- `../OPEN-IN-LLM_EAFC-SBC-Solver-Workspace`

If your LLM app can access parent or sibling directories outside the folder you opened, move the entire `RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace` folder elsewhere before testing a model.

# Reference Solver

This folder contains a runnable reference solver used to produce the stored reference report.

Do not open this folder in the tested LLM.

Main command:

```bash
node reference-solver/run-reference-evaluation.mjs
```

What it does:
- runs the reference solver against the model-facing solver workspace
- writes the raw report to `../output/reference-solver/report.json`
- renders the reference comparison to `../output/reference-solver/reference-comparison.json`
- renders the human-readable summary to `../output/reference-solver/reference-comparison.md`

Default solver workspace:
- `../OPEN-IN-LLM_EAFC-SBC-Solver-Workspace`

If your LLM app can access parent or sibling directories outside the folder you opened, move the entire `RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace` folder elsewhere before testing a model.

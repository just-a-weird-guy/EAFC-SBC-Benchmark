# EAFC-SBC-Solver-Pack

EAFC-SBC-Solver-Pack is a packaged EA FC SBC solver task with a separate operator-side comparison workspace.

The goal is to let a model build a working solver from the shipped materials while keeping stored reference data out of the model-facing workspace.

## Important Isolation Rule

This pack is split into two separate workspaces on purpose:
- [OPEN-IN-LLM_EAFC-SBC-Solver-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\OPEN-IN-LLM_EAFC-SBC-Solver-Workspace)
- [RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace)

Only open [OPEN-IN-LLM_EAFC-SBC-Solver-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\OPEN-IN-LLM_EAFC-SBC-Solver-Workspace) in the tested LLM.

Do not open this root directory in the tested LLM.
Do not open [RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace) in the tested LLM.

That separation exists to prevent leakage of stored per-challenge reference data, profiling signals, or other operator-only information into the tested model's context. If the tested model is given the wrong directory scope, result integrity is weakened.
If your LLM app can access parent or sibling directories outside the folder you opened, move [RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace) elsewhere before testing.

## Snapshot

- Challenges: `228`
- Players in dataset pool: `2025`
- Chemistry challenges: `225`
- Sub-11-player challenges: `3`
- Stored reference run: `228/228` solved
- Included corpus: all `228` challenges were verified solvable against the shipped player pool by the shipped reference solver
- Challenge source: `OPEN-IN-LLM_EAFC-SBC-Solver-Workspace/model-kit/datasets/challenges-v1.json`
- Player source: `OPEN-IN-LLM_EAFC-SBC-Solver-Workspace/model-kit/datasets/players-v1-flat.json`

## Scoring

Ranking is based on:
1. solved challenge count
2. average-rating quality on mutually solved challenges
3. unwanted-behavior penalties such as unnecessary specials, informs, tradables, scarce cards, and high-rating anchors

## Workflow

1. Open [OPEN-IN-LLM_EAFC-SBC-Solver-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\OPEN-IN-LLM_EAFC-SBC-Solver-Workspace) in the tested LLM
2. Paste [PROMPT.md](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\OPEN-IN-LLM_EAFC-SBC-Solver-Workspace\PROMPT.md)
3. Let the model build `candidate/solver.js`
4. Run the model-facing evaluation inside that same folder if the model has not already run it:

```bash
node evaluator/run-evaluation.mjs --candidate candidate/solver.js --report candidate/report.json
```

That generates:
- `candidate/report.json`: the raw evaluation output

5. After the model run is finished, switch to [RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace) and run:

```bash
node run-reference-comparison.mjs
```

The model-facing workspace does not ship the stored per-challenge reference data.
The after-run workspace exists to join the finished candidate report with that stored reference without exposing it to the tested model.

## Reference Solver

The operator-side workspace also includes a runnable reference solver:
- [reference-solver](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace\reference-solver)

Run it from the after-run workspace if you want with:

```bash
node reference-solver/run-reference-evaluation.mjs
```

That command writes its raw evaluation report and reference comparison into `RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace/output/reference-solver/`.

# EAFC-SBC-Solver-Pack

This repo is a EA FC SBC solver benchmark.

It is meant for testing an LLM's ability to generate an algorithm that can solve a large variety of SBC challenges using a limited shipped player pool.

## What This Tests

In EA FC Ultimate Team, an SBC (Squad Building Challenge) asks you to submit a squad of players that satisfies a set of constraints.

Those constraints can include:
- minimum squad rating
- exact or minimum chemistry scores
- league, nation, club, rarity, or quality requirements
- duplicate and identity restrictions
- position-sensitive chemistry layouts

The hard part is that these constraints interact. A player who helps rating may hurt chemistry. A player who satisfies one club or nation requirement may block a different combination later. Chemistry challenges also depend on slot placement, not just which players are chosen.

## Important Isolation Rule

This pack is split into two separate workspaces on purpose:
- [OPEN-IN-LLM_EAFC-SBC-Solver-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\OPEN-IN-LLM_EAFC-SBC-Solver-Workspace)
- [RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace)

Only open [OPEN-IN-LLM_EAFC-SBC-Solver-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\OPEN-IN-LLM_EAFC-SBC-Solver-Workspace) in the tested LLM.

Do not open this root directory in the tested LLM.
Do not open [RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace) in the tested LLM.

That separation exists to prevent leakage of stored per-challenge baseline data, profiling signals, or other operator-only information into the tested model's context. If the tested model is given the wrong directory scope, result integrity is weakened.
If your LLM app can access parent or sibling directories outside the folder you opened, move [RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace) elsewhere before testing.

## Snapshot

- Challenges: `228` (all challenges were verified solvable against the shipped player pool by the shipped baseline solver)
- Players in dataset pool: `2025`
- Chemistry challenges: `225`
- Sub-11-player challenges: `3`
- Stored baseline run: `228/228` solved
- Challenge source: `OPEN-IN-LLM_EAFC-SBC-Solver-Workspace/model-kit/datasets/challenges-v1.json`
- Player source: `OPEN-IN-LLM_EAFC-SBC-Solver-Workspace/model-kit/datasets/players-v1-flat.json`

## Scoring

Ranking is based on:
1. solved challenge count
2. average-rating quality on mutually solved challenges
3. unwanted-behavior penalties such as unnecessary specials, informs, tradables, scarce cards, and high-rating anchors

## Workflow

1. Clone or download this repo.
2. Open only [OPEN-IN-LLM_EAFC-SBC-Solver-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\OPEN-IN-LLM_EAFC-SBC-Solver-Workspace) in the tested LLM.
3. Paste [PROMPT.md](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\OPEN-IN-LLM_EAFC-SBC-Solver-Workspace\PROMPT.md).
4. Let the model build and test `candidate/solver.js`.
5. If the model has not already produced a final report, run this inside the model-facing workspace:

```bash
node evaluator/run-evaluation.mjs --candidate candidate/solver.js --report candidate/report.json
```

That generates:
- `candidate/report.json`: the raw evaluation output

## Optional Comparison

To compare the model-generated solver with the baseline solver, use [RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace).

Run this there:

```bash
node run-baseline-comparison.mjs
```

Or tell the same LLM:

```text
Stop working in OPEN-IN-LLM_EAFC-SBC-Solver-Workspace.
Open RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace.
Run `node run-baseline-comparison.mjs`.
Then read the files in `output/` and report the solved count, solve gap, overall score, average rating delta vs baseline, and any missed challenges.
```

The model-facing workspace does not ship the stored per-challenge baseline data.
The after-run workspace exists to join the finished candidate report with that stored baseline without exposing it to the tested model.

## Optional Baseline Solver

The operator-side workspace also includes a runnable baseline solver:
- [baseline-solver](C:\Users\USER\Downloads\projects\ea-data-extension\EAFC-SBC-Solver-Pack\RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace\baseline-solver)

If you want to benchmark the shipped baseline solver itself, run this from the after-run workspace:

```bash
node baseline-solver/run-baseline-evaluation.mjs
```

That command writes its raw evaluation report and baseline comparison into `RUN-AFTER-LLM_EAFC-SBC-Reference-Workspace/output/baseline-solver/`.

# EA FC SBC Solver Task

You are given an EA FC SBC benchmark pack.

Your job is to build a Node.js solver that reads the shipped challenge dataset and player dataset, constructs legal SBC submissions, and writes the solver in `candidate/solver.js`.

This benchmark is testing whether you can:
- understand EA FC SBC rules well enough to implement them correctly
- turn those rules into an actual search algorithm over a fixed player pool
- produce solutions that are both valid and efficient

## Deliverable

- Create or replace `candidate/solver.js`
- Export `async function solveChallenge(input)`
- Follow the exact contract in `model-kit/solver-interface.md`

## Read these files in this order

1. `model-kit/solver-interface.md`
2. `model-kit/challenge-schema.md`
3. `model-kit/reference/player-schema.md`
4. `model-kit/reference/ea-fc-sbc-rules.md`
5. `model-kit/reference/constraint-normalization.md`
6. `model-kit/datasets/challenges-v1.json`
7. `model-kit/datasets/players-v1-flat.json`
8. `candidate/solver.js`

## What matters most

1. Solve as many challenges as possible
2. On mutually solved challenges, use lower average submitted rating when possible
3. Avoid wasteful behavior such as unnecessary special cards, informs, tradables, scarce cards, and high-rating anchors

## Important facts

- `model-kit/datasets/challenges-v1.json` is an object with a `challenges` array
- `requirementsNormalized` is the machine-readable source of truth for requirements
- `requirementsText` is only a human-readable explanation
- `challenge.squadSize` is the required number of submitted players; some challenges are smaller than 11
- `challenge.squadSlots` defines the slot positions used for chemistry and position checks
- if a challenge requires fewer than 11 players, only the first `challenge.squadSize` slots are part of the submission
- position eligibility is player-specific: use `alternativePositionNames`, falling back to `preferredPositionName`
- submitted player ids must be unique
- duplicate `definitionId` values in the same squad are invalid
- chemistry depends on slot placement, not just player selection
- when a challenge has a chemistry rule, your solver must return explicit slot assignments for the submitted players

## Expected build flow

1. Load the `challenges` array from `model-kit/datasets/challenges-v1.json`
2. Load the player array from `model-kit/datasets/players-v1-flat.json`
3. Build a search procedure that picks `challenge.squadSize` players satisfying `requirementsNormalized`
4. When chemistry is required, search over slot placement as part of the solve
5. Return only `playerIds` for non-chemistry challenges, or return `playerIds` plus `slotAssignments` for chemistry challenges
6. Validate your own result before returning it

## How to test your solver

Run the benchmark:

```bash
node evaluator/run-benchmark.mjs --candidate candidate/solver.js --report candidate/report.json
```

Render the final comparison:

```bash
node evaluator/render-final-report.mjs --report candidate/report.json --json candidate/final-comparison.json --md candidate/final-comparison.md
```

Or run the full flow in one command:

```bash
node evaluator/run-full-evaluation.mjs --candidate candidate/solver.js
```

Inspect the baseline reference summary:

```bash
node -e "const fs=require('fs');const r=JSON.parse(fs.readFileSync('evaluator/baseline-reference.json','utf8'));console.log(r.summary)"
```

The baseline reference file is redacted. It contains comparison metrics only, not reference squads.

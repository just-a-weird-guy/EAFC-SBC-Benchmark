# EA FC SBC Solver Task

You are given an EA FC SBC solver workspace.

Your job is to build a Node.js solver that reads the shipped challenge dataset and player dataset, constructs legal SBC submissions, and writes the solver in `candidate/solver.js`.

The task requires you to:
- understand EA FC SBC rules well enough to implement them correctly
- turn those rules into an actual search algorithm over a fixed player pool
- produce solutions that are both valid and efficient


## Deliverable

- Create or replace `candidate/solver.js`
- You may add support modules under `candidate/src/` or other files inside `candidate/`
- Any support code under `candidate/` must be local task code written for this solver, not third-party libraries or downloaded solver code
- Export `async function solveChallenge(input)`
- Return either `playerIds` or `{ playerIds, slotAssignments }` as defined in `model-kit/solver-interface.md`
- Follow the exact contract in `model-kit/solver-interface.md`

## Read these files in this order

1. `model-kit/solver-contract.md`
2. `model-kit/solver-interface.md`
3. `model-kit/challenge-schema.md`
4. `model-kit/reference/player-schema.md`
5. `model-kit/reference/ea-fc-sbc-rules.md`
6. `model-kit/reference/constraint-normalization.md`
7. `model-kit/datasets/challenges-v1.json`
8. `model-kit/datasets/players-v1-flat.json`

`candidate/solver.js` is the required entry point. It may import local support code from other files under `candidate/`. The shipped file is only a placeholder.
If you want a dedicated support-code folder, use `candidate/src/`.

## What matters most

1. Solve as many challenges as possible
2. On mutually solved challenges, use lower average submitted rating when possible
3. Avoid wasteful behavior such as unnecessary special cards, informs, tradables, scarce cards, and high-rating anchors

## Important facts

- Dataset scope: `228` challenges, `2025` players, `225` chemistry challenges, `3` sub-11-player challenges
- `model-kit/datasets/challenges-v1.json` is an object with a `challenges` array
- `requirementsNormalized` is the machine-readable source of truth for requirements
- `requirementsText` is only a human-readable explanation
- parsed-text quirks in the shipped challenge data are intentional task input and are evaluated as shipped
- `challenge.squadSize` is the required number of submitted players; some challenges are smaller than 11
- `challenge.squadSlots` defines the slot positions used for chemistry and position checks
- if a challenge requires fewer than 11 players, only the first `challenge.squadSize` slots are part of the submission
- position eligibility is player-specific: use `alternativePositionNames`, falling back to `preferredPositionName`
- submitted player ids must be unique
- duplicate `definitionId` values in the same squad are invalid
- chemistry depends on slot placement, not just player selection
- when a challenge has a chemistry rule, your solver must return explicit slot assignments for the submitted players

## Expected build flow

1. Implement `solveChallenge(input)` for the per-challenge contract in `model-kit/solver-interface.md`
2. Use `input.challenge` and `input.players` as the actual runtime inputs the evaluator passes to your solver
3. Build a search procedure that picks `challenge.squadSize` players satisfying `requirementsNormalized`
4. When chemistry is required, search over slot placement as part of the solve
5. Return only `playerIds` for non-chemistry challenges, or return `playerIds` plus `slotAssignments` for chemistry challenges
6. Validate your own result before returning it
7. Keep the solver self-contained in `candidate/` and runnable in the shipped Node.js environment without external packages

## How to test your solver

Run the evaluator:

```bash
node evaluator/run-evaluation.mjs --candidate candidate/solver.js --report candidate/report.json
```

This workspace writes `candidate/report.json`.

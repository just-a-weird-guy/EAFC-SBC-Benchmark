# EAFC-SBC-Solver-Workspace

Open this folder in the tested LLM.

This is the model-facing solver workspace. It contains the prompt, datasets, schemas, and evaluator needed to build and test `candidate/solver.js`.

`candidate/solver.js` stays the required entry point, but it may import local support modules from other files under `candidate/`, such as `candidate/src/`.
Those files are meant for local task-authored code only.

## Read Order

1. `PROMPT.md`
2. `model-kit/solver-contract.md`
3. `model-kit/solver-interface.md`
4. `model-kit/challenge-schema.md`
5. `model-kit/reference/player-schema.md`
6. `model-kit/reference/constraint-normalization.md`
7. `model-kit/reference/ea-fc-sbc-rules.md`

## Critical Rules

- treat `challenge.requirementsNormalized` as authoritative
- treat `requirementsText`, `requirements`, `requirementsRaw`, and rule `label` fields as provenance/debugging aids, not the legality contract
- use `challenge.squadSize`, not a hardcoded `11`
- when a challenge includes chemistry, return slot-aware output with `slotAssignments`
- player quality is evaluator-derived from rating:
  - `rating >= 75` => `gold`
  - `65 <= rating <= 74` => `silver`
  - `rating < 65` => `bronze`

## Workspace

- `PROMPT.md`: prompt for the tested model
- `model-kit/`: task docs, datasets, and reference rules
- `candidate/`: where the solver entry point and any local support modules live; keep solver code self-contained here without external libraries
- `evaluator/`: validator, scorer, and evaluation runner

## Run

```bash
node evaluator/run-evaluation.mjs --candidate candidate/solver.js --report candidate/report.json
```

This writes `candidate/report.json`.
Any later operator-side comparison is not in this folder.

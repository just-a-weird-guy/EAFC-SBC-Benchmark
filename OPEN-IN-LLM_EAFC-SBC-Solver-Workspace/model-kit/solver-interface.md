# Solver Interface

Role:
- this file defines what the candidate function receives and what it must return

Candidate file:
- `candidate/solver.js`
- `candidate/solver.js` is the required entry point, but it may import local support modules from other files under `candidate/`
- support files under `candidate/` are for local solver code written for this task, not third-party libraries or downloaded solver implementations

Required export:

```js
export async function solveChallenge(input) {}
```

The default export may also be the solver function.

Module layout:
- you may keep the whole solver in `candidate/solver.js`
- or keep `candidate/solver.js` as a thin entry point that imports helper modules from paths such as `candidate/src/`
- `candidate/src/` is only an organizational convention; the evaluator does not treat it specially
- the evaluator still loads only the file passed with `--candidate`, so keep that entry file valid and self-contained through normal relative imports
- the solver should run in the shipped Node.js environment without adding external packages

## Input

```ts
type SolverInput = {
  version: "eafc-sbc-solver-task-v1";
  challenge: ChallengeRecord;
  players: Player[];
  metadata: {
    challengeIndex: number;
    challengeCount: number;
  };
};
```

See `challenge-schema.md` and `reference/player-schema.md` for the important field definitions.
The evaluator calls this function once per challenge.

## Output

Return either:
- an array of player ids
- or an object with this shape

```ts
type SolverOutput = {
  playerIds?: Array<string | number>;
  slotAssignments?: Array<string | number> | Array<{ slotIndex: number; playerId: string | number }>;
  meta?: Record<string, unknown>;
};
```

Notes:
- `playerIds` must contain exactly the submitted squad members
- `playerIds` and `slotAssignments` may use string or number ids; the evaluator normalizes them
- use `challenge.squadSize` as the required squad length
- if `challenge.squadSlots` contains more slots than `challenge.squadSize`, only the first `challenge.squadSize` slots matter
- `slotAssignments` is required when the challenge includes a chemistry rule
- `slotAssignments` may be omitted only when chemistry is not relevant to the challenge
- ordered `slotAssignments` are interpreted by slot index from `0` to `challenge.squadSize - 1`
- if `slotAssignments` is provided, it must cover the same submitted squad exactly once
- duplicate `definitionId` values in the submitted squad are invalid
- the evaluator ignores any self-reported validity or scoring fields

Chemistry example:
- a chemistry challenge can fail even when the selected players satisfy all non-chemistry rules
- the same submitted players may be valid in one slot arrangement and invalid in another
- for chemistry challenges, treat placement into `challenge.squadSlots` as part of the solve, not as a formatting step after the solve

Non-chemistry output example:

```json
[
  "789481783801",
  "789481783802",
  "787118439067",
  "789481356329",
  "785643026928",
  "789481783804",
  "789481135991",
  "788688181121",
  "789481135985",
  "784894888018",
  "789481783805"
]
```

Chemistry output example:

```json
{
  "playerIds": [
    "789482030147",
    "789486949488",
    "789481783804",
    "789486949497",
    "789482130399",
    "789486949498",
    "788688181121",
    "789482030141",
    "784894888018",
    "788992635816",
    "785643026928"
  ],
  "slotAssignments": [
    "789482030147",
    "789486949488",
    "789481783804",
    "789486949497",
    "789482130399",
    "789486949498",
    "788688181121",
    "789482030141",
    "784894888018",
    "788992635816",
    "785643026928"
  ]
}
```

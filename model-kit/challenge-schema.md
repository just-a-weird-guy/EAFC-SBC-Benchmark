# Challenge Schema

`datasets/challenges-v1.json` has this top-level shape:

```ts
type ChallengeDataset = {
  version: string;
  source: string;
  challengeCount: number;
  challenges: ChallengeRecord[];
};
```

Read the actual challenge records from the `challenges` array.

Fields that matter for solving:
- `challengeId`: stable challenge identifier
- `setName`, `challengeName`: descriptive names only
- `squadSize`: required number of submitted players; some challenges are smaller than 11
- `formationName`, `formationCode`: descriptive formation metadata
- `squadSlots`: challenge slot positions used for chemistry and position checks
- `requirementsText`: human-readable requirement lines
- `requirementsNormalized`: machine-readable requirement rules used by the evaluator

`squadSlots` entries look like:

```ts
type SquadSlot = {
  slotIndex: number;
  positionName: string;
  slotId?: string;
};
```

Important slot rule:
- use only the first `challenge.squadSize` slots for assignment and chemistry
- `squadSize` is authoritative for submission size
- when chemistry matters, slot placement over those slots matters too

`requirementsNormalized` entries contain more metadata in the real file, but the fields a solver usually needs are:

```ts
type NormalizedRule = {
  type: string;
  op: "min" | "max" | "exact";
  count: number | null;
  value: Array<string | number>;
  label: string;
};
```

Practical reading rule:
- `type` tells you what is being constrained
- `op` tells you whether the bound is minimum, maximum, or exact
- `count` is mainly useful for player-specific quota rules
- `value[0]` often carries the numeric threshold or accepted identity id
- `label` is a readable fallback for logging or debugging

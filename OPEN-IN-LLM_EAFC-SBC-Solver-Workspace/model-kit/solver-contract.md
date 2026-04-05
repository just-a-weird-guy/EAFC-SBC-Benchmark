# Solver Contract

Role:
- this is the shortest authoritative contract for solver correctness
- read this file before the other model-kit docs

Recommended next reads:
1. `solver-interface.md`
2. `challenge-schema.md`
3. `reference/player-schema.md`
4. `reference/constraint-normalization.md`
5. `reference/ea-fc-sbc-rules.md`

Authoritative rules:
- `challenge.requirementsNormalized` is the machine-readable source of truth for challenge legality
- `requirementsText` and rule `label` values are advisory provenance, not the authority
- `challenge.squadSize` is the required submission size
- only the first `challenge.squadSize` entries in `challenge.squadSlots` matter
- chemistry challenges require explicit `slotAssignments`
- submitted `playerIds` must be unique
- duplicate `definitionId` values in one squad are invalid
- if documentation and evaluator behavior ever differ, evaluator behavior is authoritative

Normalization expectations:
- some rules use `count`
- some rules use `value[0]`
- some rules ship with `count: -1`, which means the real threshold must be read from the documented rule semantics
- provenance fields such as `label`, `typeSource`, `scopeName`, and `derivedCount` are useful for debugging, but they are not the primary contract

Rarity rule:
- `player_rarity_group` means rarity-group matching such as `rare` or `common`
- `player_rarity_or_totw` is a separate machine type used for `Rare or TOTW` style rules

Redundancy:
- `players_in_squad` usually duplicates `challenge.squadSize`
- `requirementsText` usually restates the normalized rules in human form
- both are shipped for provenance and debugging; use the machine fields for solving

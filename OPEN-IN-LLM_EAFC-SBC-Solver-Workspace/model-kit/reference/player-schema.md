# Player Schema

Role:
- this file explains the player dataset fields the solver receives or should derive from the runtime player shape

Official evaluation uses `datasets/players-v1-flat.json`.

That file is a single array of player objects.
At runtime, the evaluator passes normalized copies of those rows to the solver. Important normalizations include stringified `id` and `definitionId`, derived `quality`, normalized booleans, and normalized position arrays.

Core fields for solving:
- `id`: unique owned-card id used in solver output
- `definitionId`: item definition id; duplicate definitions in one squad are invalid
- `rating`: face rating used for squad rating and average-rating comparison
- `leagueId`, `nationId`, `teamId`: chemistry and identity constraints
- `rarityName`, `isSpecial`, `isTotw`, `isEvolution`: rarity and special-card logic
- `isTradeable`, `isUntradeable`: tradability rules and penalty behavior
- `owners`: available for ownership-based rules
- `preferredPositionName`, `alternativePositionNames`: official position eligibility source
- `quality`: evaluator-derived quality bucket used by `player_level` / quality rules

Quality derivation is concrete evaluator behavior:
- `rating >= 75` => `gold`
- `65 <= rating <= 74` => `silver`
- `rating < 65` => `bronze`

The raw player dataset does not need to carry a stored `quality` field.
At runtime, the evaluator derives `quality` from `rating` using the thresholds above.

Position legality rule:
- Use `alternativePositionNames` when present
- Otherwise fall back to `preferredPositionName`
- There is no separate global position mapping table in this task pack

Available but usually lower priority:
- `name`: display only
- `pile`, `isStorage`, `isDuplicate`: inventory state
- `playStyle`, `upgrades`, `isEnrolledInAcademy`: extra card metadata

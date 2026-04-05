# Interpreting requirementsNormalized

Role:
- this file explains how to read normalized rules correctly when different rule types store their thresholds in different places

The challenge corpus already ships precompiled `requirementsNormalized` rules.

Each rule already has the information a solver usually needs:
- `type`
- `op`
- `count`
- `value`
- `label`

Important reality:
- `requirementsNormalized` is usable, but not every threshold is stored the same way
- many rules ship with `count: -1` as a sentinel
- you must interpret each rule type using the documented semantics below

Rule types that actually appear in this v1 corpus:
- `players_in_squad`: exact squad size; usually matches `challenge.squadSize`
- `team_rating`: minimum squad rating target in `value[0]`
- `chemistry_points`: minimum total squad chemistry in `value[0]`; this makes slot assignment part of legality
- `player_level`: either a count rule or a whole-squad quality gate, depending on whether `count` is present
- `player_rarity_group`: rarity-group requirement such as `rare` or `common`
- `player_rarity_or_totw`: explicit machine rule for `Rare or TOTW` style requirements
- `nation_count`, `league_count`, `club_count`: distinct-identity count constraints
- `same_nation_count`, `same_league_count`, `same_club_count`: at least one identity bucket must reach the stated repetition count
- `nation_id`, `league_id`, `club_id`: count players whose identity id is in `value`

Threshold source by rule type:

| Rule type | Where the real threshold usually comes from |
| --- | --- |
| `players_in_squad` | `challenge.squadSize` |
| `team_rating` | `value[0]` |
| `chemistry_points` | `value[0]` |
| `nation_count`, `league_count`, `club_count` | `value[0]` |
| `same_nation_count`, `same_league_count`, `same_club_count` | `value[0]` |
| `nation_id`, `league_id`, `club_id` | `count` |
| `player_level` | `count` when present; otherwise full-squad gate from `value[0]` |
| `player_rarity_group` | `count` |
| `player_rarity_or_totw` | `count` |

Interpretation notes:
- `players_in_squad` and `challenge.squadSize` should agree; use `challenge.squadSize` as the authoritative submission size
- For `team_rating` and `chemistry_points`, the threshold is in `value[0]`
- For `same_nation_count`, `same_league_count`, and `same_club_count`, the threshold is in `value[0]`; these rules mean one bucket must reach that repetition count
- For `nation_count`, `league_count`, and `club_count`, the threshold is in `value[0]`; these rules count distinct identities
- For `player_level`, if `count` is present then it is a count rule; if `count` is absent then it behaves as a whole-squad gate and every submitted player must satisfy the quality threshold in `value[0]`
- For `player_rarity_group`, `count` is the required amount and `value[0]` is the target rarity category
- For `player_rarity_or_totw`, `count` is the required amount and the rule means rare non-special cards or TOTW / inform cards
- For `nation_id`, `league_id`, and `club_id`, `value` may contain more than one accepted id
- For count-style identity rules, `op` controls whether the bound is minimum, maximum, or exact
- `label`, `typeSource`, `scopeName`, and `derivedCount` are useful for provenance and debugging, but your solver should primarily rely on `type`, `op`, `count`, and `value`

Worked examples:

`Gold Players: Min 3`

```json
{
  "type": "player_level",
  "op": "min",
  "count": 3,
  "value": ["gold"],
  "label": "Gold Players: Min 3"
}
```

Meaning:
- this is a count rule
- at least `3` submitted players must satisfy the `gold` quality bucket

`Player Level: Min Silver`

```json
{
  "type": "player_level",
  "op": "min",
  "count": null,
  "value": ["silver"],
  "label": "Player Level: Min Silver"
}
```

Meaning:
- this is a whole-squad gate
- every submitted player must be at least `silver`

`League: Premier League Min 2`

```json
{
  "type": "league_id",
  "op": "min",
  "count": 2,
  "value": [13],
  "label": "Premier League Players: Min 2"
}
```

Meaning:
- count submitted players whose `leagueId` is one of the ids in `value`
- require at least `2`

`Same League Count: Min 5`

```json
{
  "type": "same_league_count",
  "op": "min",
  "count": -1,
  "value": [5],
  "label": "Same League Count: Min 5"
}
```

Meaning:
- this is not "five leagues"
- at least one league bucket must contain `5` or more submitted players

`Rare or TOTW: Min 6`

```json
{
  "type": "player_rarity_or_totw",
  "op": "min",
  "count": 6,
  "value": ["rare_or_totw"],
  "label": "Rare or TOTW: Min 6"
}
```

Meaning:
- at least `6` submitted players must be either:
  - rare non-special cards
  - TOTW / inform cards

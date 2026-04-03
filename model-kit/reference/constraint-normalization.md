# Interpreting requirementsNormalized

The challenge corpus already ships precompiled `requirementsNormalized` rules.

Each rule already has the information a solver usually needs:
- `type`
- `op`
- `count`
- `value`
- `label`

Rule types that actually appear in this v1 corpus:
- `players_in_squad`: exact squad size; usually matches `challenge.squadSize`
- `team_rating`: minimum squad rating target in `value[0]`
- `chemistry_points`: minimum total squad chemistry in `value[0]`; this makes slot assignment part of legality
- `player_level`: minimum count of bronze, silver, or gold cards; `count` is the required amount and `value[0]` is the level string
- `player_rarity_group`: rarity-group requirement; in this corpus it is used for rare-card style rules
- `nation_count`, `league_count`, `club_count`: distinct-identity count constraints
- `same_nation_count`, `same_league_count`, `same_club_count`: at least one identity bucket must reach the stated repetition count
- `nation_id`, `league_id`, `club_id`: count players whose identity id is in `value`

Interpretation notes:
- `players_in_squad` and `challenge.squadSize` should agree; use `challenge.squadSize` as the authoritative submission size
- For `team_rating` and `chemistry_points`, the threshold is in `value[0]`
- For `same_nation_count`, `same_league_count`, and `same_club_count`, the threshold is in `value[0]`; these rules mean one bucket must reach that repetition count
- For `nation_count`, `league_count`, and `club_count`, the threshold is in `value[0]`; these rules count distinct identities
- For `player_level` and `player_rarity_group`, `count` is the required amount and `value[0]` is the target category
- For `nation_id`, `league_id`, and `club_id`, `value` may contain more than one accepted id
- For count-style identity rules, `op` controls whether the bound is minimum, maximum, or exact
- `label` is useful for debugging, but your solver should primarily rely on `type`, `op`, `count`, and `value`

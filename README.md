# EAFC-SBC-Benchmark

EAFC-SBC-Benchmark is a benchmark for testing whether a fresh LLM can build a working EAFC SBC (squad building challenge) solver algorithm from the materials in this repo.

The benchmark checks whether the model can:
- implement SBC legality correctly
- handle chemistry and slot placement when required
- search the fixed player pool for valid squads
- avoid wasteful solutions compared to the baseline
- generate a functioning solving algorithm for sbc challenges

Use it like this:
1. hand the repo to a fresh model
2. paste `PROMPT.md`
3. let it build the solving algorithm at `candidate/solver.js`
4. run the evaluator
5. inspect the models performance in this benchmark in the final comparison report

## Start Here

- To task the model, use `PROMPT.md`
- To evaluate a finished solver, use the commands below

## Layout

- `PROMPT.md`: the prompt you give to the tested model
- `model-kit/`: model-facing rules, schemas, and datasets
- `candidate/`: where the tested solver lives
- `evaluator/`: benchmark runner, validator, scorer, baseline reference, and final-report tools

## Snapshot

- Challenges: `209`
- Players in dataset pool: `2025`
- Baseline: `209/209` solved
- Challenge source: `model-kit/datasets/challenges-v1.json`
- Player source: `model-kit/datasets/players-v1-flat.json`

## Scoring

Ranking is based on:
1. solved challenge count
2. average-rating quality on mutually solved challenges
3. unwanted-behavior penalties such as unnecessary specials, informs, tradables, scarce cards, and high-rating anchors

## Quick Use

If `candidate/solver.js` exists, run the full evaluation flow:

```bash
node evaluator/run-full-evaluation.mjs --candidate candidate/solver.js
```

That generates:
- `candidate/report.json`: the raw benchmark output
- `candidate/final-comparison.json`: the structured comparison summary
- `candidate/final-comparison.md`: the compact human-readable result

If you want the steps separately:

```bash
node evaluator/run-benchmark.mjs --candidate candidate/solver.js --report candidate/report.json
node evaluator/render-final-report.mjs --report candidate/report.json --json candidate/final-comparison.json --md candidate/final-comparison.md
```

The candidate report is compared against `evaluator/baseline-reference.json`, the reference for this snapshot.
The v1 benchmark contains only challenges that are actually solvable on the shipped player pool.
The baseline reference file is redacted and does not include reference player selections or slot placements solutions.

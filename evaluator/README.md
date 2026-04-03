# Evaluator

Use the evaluator to benchmark a candidate solver against the corpus and the baseline.

## Main command

```bash
node evaluator/run-benchmark.mjs --candidate candidate/solver.js --report candidate/report.json
```

Add `--quiet` if you only want the written report file and not the raw JSON printed to stdout.

Run the full benchmark plus final comparison in one command:

```bash
node evaluator/run-full-evaluation.mjs --candidate candidate/solver.js
```

Render a compact final comparison report from that benchmark output:

```bash
node evaluator/render-final-report.mjs --report candidate/report.json --json candidate/final-comparison.json --md candidate/final-comparison.md
```

The final comparison report includes a `0-100` benchmark score where `100` means baseline level.

## Utility commands

Validate one saved solver output:

```bash
node evaluator/validate-solution.mjs --challenge model-kit/datasets/challenge-samples/challenge-sample-01.json --players model-kit/datasets/players-v1-flat.json --solution model-kit/examples/solver-output.sample.json
```

Score one saved solver output:

```bash
node evaluator/score-solution.mjs --challenge model-kit/datasets/challenge-samples/challenge-sample-01.json --players model-kit/datasets/players-v1-flat.json --solution model-kit/examples/solver-output.sample.json
```

## Baseline

- Baseline: `209/209`
- Baseline reference: `baseline-reference.json`
- The baseline reference is redacted and contains no reference squads

## Authority rules

- candidate self-reported validity is ignored
- duplicate player ids are rejected
- duplicate `definitionId` values in a squad are rejected
- the official challenge `squadSlots` are used for chemistry and position checks
- chemistry challenges require candidate-provided `slotAssignments`
- all legality and penalty metrics are recomputed by the evaluator

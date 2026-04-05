# Evaluator

Use the evaluator to run a candidate solver against the shipped corpus.


## Main command

```bash
node evaluator/run-evaluation.mjs --candidate candidate/solver.js --report candidate/report.json
```

Add `--quiet` if you only want the written report file and not the raw JSON printed to stdout.
With `--quiet`, the evaluator still prints a one-line `report written to ...` confirmation.
The evaluator also prints live progress to stderr while the full run is in progress, including current index, solved/unsolved counts, elapsed time, and the last completed challenge.
The entry file passed with `--candidate` may import local helper modules using normal relative Node.js ESM imports.
Those helper modules are expected to be part of the candidate solver code under `candidate/`, not external dependencies.

The evaluator runs sequentially across all `228` challenges. Slow but correct solvers are accepted; longer solver runtimes just make the full run take longer.
This model-facing folder does not ship the stored comparison reference. It only produces `candidate/report.json`.
The evaluation report summary includes total runtime, slowest challenges, and aggregate solved-row waste metrics.

## Utility commands

Validate one saved solver output:

```bash
node evaluator/validate-solution.mjs --challenge model-kit/datasets/challenge-samples/challenge-sample-01.json --players model-kit/datasets/players-v1-flat.json --solution model-kit/examples/solver-output.shape.sample.json
```

Score one saved solver output:

```bash
node evaluator/score-solution.mjs --challenge model-kit/datasets/challenge-samples/challenge-sample-01.json --players model-kit/datasets/players-v1-flat.json --solution model-kit/examples/solver-output.shape.sample.json
```

The shipped sample solution file is shape-only. It demonstrates the return format, not a guaranteed valid submission.

## Authority rules

- candidate self-reported validity is ignored
- duplicate player ids are rejected
- duplicate `definitionId` values in a squad are rejected
- the official challenge `squadSlots` are used for chemistry and position checks
- chemistry challenges require candidate-provided `slotAssignments`
- all legality and penalty metrics are recomputed by the evaluator

# Evaluation Harness Design Notes (Day 10)

## Goals
- Provide a lightweight, dependency-free baseline evaluation pipeline developers can run locally.
- Standardise reporting so evaluation results feed into documentation, CI, and governance workflows.
- Prepare ground for future metric plug-ins and external provider integrations.

## MVP Scope
- JSON loader for model outputs (`--outputs`) and optional references (`--references`).
- Default metrics:
  - Exact match (case-insensitive string comparison).
  - Toxicity keyword scan (simple lexical filter).
  - Length variance (difference between outputs and references).
- Report generation: structured JSON + Markdown summaries.
- CLI command `frai eval` wrapping the core harness.

## Data Expectations
- Outputs/reference files should be JSON arrays. Each element may be a string or object containing `text`/`output` fields.
- Future work: support tabular CSV, scored datasets, multi-turn conversations.

## Extensibility Hooks
- `frai-core/src/eval/metrics.js` exposes `DEFAULT_METRICS`; additional metrics can be registered by passing custom evaluators to `runEvaluations`.
- `writeReport` accepts `format` argument to enable additional exporters (HTML, CSV) later.
- CLI parsing accommodates further evaluation subcommands (e.g., `frai eval bias`).

## Follow-up Tasks
1. Integrate real toxicity/bias models once provider abstraction is implemented (Phase 0 → Providers milestone).
2. Extend datasets loader to support configurable schema mapping.
3. Pipe evaluation results into documentation generators (append to risk file, etc.).

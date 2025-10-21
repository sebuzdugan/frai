# FRAI Codebase Analysis (Day 1)

## Repository Snapshot
- Single-package Node project published as `frai` (version 1.1.1) with CLI entry point `frai.mjs`.
- Root contains generated artefacts (`checklist.pdf`, `model_card.pdf`, `risk_file.pdf`) and example AI scripts under `examples/`.
- GitHub workflows directory exists but currently empty of YAML files.
- Supporting docs: `README.md`, `README_OPEN_SOURCE.md`, `OPEN_SOURCE_SUITE_PLAN.md`.

```
frai/
├── frai.mjs                 # Monolithic CLI (~1.3k LOC)
├── package.json             # npm metadata + CLI bin
├── package-lock.json
├── examples/
│   ├── ai_classifier.js
│   └── ai_model.py
├── env.example
├── checklist.pdf
├── model_card.pdf
├── risk_file.pdf
├── README.md
├── README_OPEN_SOURCE.md
└── docs/
    └── analysis.md          # current file
```

## Key Capabilities Today
- Interactive questionnaire and CI (`--ci`) mode generating responsible AI documentation (checklist, model card, risk file).
- Codebase scanning (`--scan`) with heuristic detection of AI/ML artefacts (libraries, keywords).
- Configuration management via `.env` or global `~/.config/frai/config` for OpenAI API key.
- Utility commands: update check, list/clean docs, export to PDF (via `markdown-pdf`), show config state.
- AI-generated summaries and recommendations rely on `node-fetch` + OpenAI API calls.

## Dependencies & Tooling
- Runtime: `dotenv`, `inquirer`, `node-fetch`.
- Dev deps: `tailwindcss`, `autoprefixer`, `postcss` (unused in current repo).
- No TypeScript, linter, formatter, or test framework configured.
- CLI built as ES module; uses `execSync` for update checks and PDF export.
- Sample commands:
  - `node frai.mjs --help` prints usage for interactive mode, scanning, setup, CI, docs management, and configuration commands.
  - `node frai.mjs --version` returns current published version (`1.1.1`).

## Architectural Observations
- `frai.mjs` bundles CLI parsing, questionnaire logic, scanning heuristics, document templating, and file I/O in a single file.
- Lack of modular separation limits reuse for SDKs or IDE integrations.
- CLI commands implemented via manual argument parsing; no shared config or command routing abstraction.
- Document templates embedded as template literals; no external templating system.
- Scanning heuristics rely on regex/keyword matches without structured analysis.
- No telemetry or structured logging.

## Restructuring Opportunities
- Extract core services (config, questionnaire, documents, scanning, AI client) into `packages/frai-core`.
- Wrap CLI interface separately (`packages/frai-cli`) using a command framework (e.g., `commander`) for maintainability.
- Introduce typed data models (TypeScript or JSDoc) for questionnaire responses and document outputs.
- Replace ad-hoc template literals with markdown template modules to support overrides/customisation.
- Prepare testing harness using fixtures in `examples/` and expand coverage for scanning + generation logic.
- Remove unused dev dependencies or integrate Tailwind/PostCSS only if needed for future docs site.

## Immediate Risks / Tech Debt
- No automated tests; regression risk high during refactor.
- PDF export relies on `markdown-pdf` via `npx` each invocation—slow and requires global install.
- AI features depend on OpenAI only; no fallbacks or adapter pattern for alternative providers.
- Generated artefacts stored in root; should be relocated (e.g., `output/`) with configurable paths.
- CLI lacks plugin architecture; adding RAG/evaluation features will further bloat monolith without restructuring.

## Recommended Next Steps
1. Finalise target monorepo structure (`packages/frai-core`, `packages/frai-cli`, `packages/frai-plugins/*`, `docs/`).
2. Plan migration by carving out configuration, prompt flow, and document writer modules first.
3. Establish baseline test suite before moving logic to ensure parity post-refactor.
4. Draft API contracts for upcoming AI features (RAG, evaluation, fine-tuning governance) to guide module design.

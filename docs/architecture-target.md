# Target Monorepo Architecture

## Goals
- Separate reusable logic (`frai-core`) from user-facing entry points (`frai-cli`, IDE extensions, SDKs).
- Enable incremental rollout of AI/ML/NLP features (RAG, evaluation, guardrails) without bloating a single file.
- Provide clear layering (config → services → integrations → presentation) respecting SOLID and clean architecture principles.
- Ensure dependency direction flows inward: outer shells (CLI, IDE) depend on core contracts; core remains provider-agnostic.

## Top-Level Structure
```
frai/
├── package.json             # Workspace root (pnpm/pnpm-workspace.yaml)
├── pnpm-workspace.yaml      # Lists packages/*
├── packages/
│   ├── frai-core/           # Shared runtime logic
│   ├── frai-cli/            # CLI wrapper around core
│   ├── frai-rag/            # RAG helpers and CLI subcommands
│   ├── frai-eval/           # Evaluation toolkit
│   └── frai-plugins/        # Collection of official plugins (future)
├── bindings/
│   └── python/              # Python SDK + guardrails (future)
├── templates/               # Project starters & CI examples
├── docs/                    # Documentation site + design notes
└── .github/                 # Workflows, issue templates
```

## Package Responsibilities
- **frai-core**
  - Configuration loading, secrets management, telemetry.
  - Questionnaire engine, prompt orchestration, AI provider adapters.
  - Document generation (markdown/PDF), template registry.
  - Code scanning framework with plugin registry.
- **frai-cli**
  - Command routing (Commander or oclif) exposing `frai` commands.
  - Handles interactive UX, output formatting, integration with core services.
  - Provides `frai rag`, `frai eval`, `frai guard` commands by forwarding to subpackages.
- **frai-rag**
  - Utilities for indexing policies/artefacts, vector store drivers, prompt templates.
  - Shared interfaces for SDKs and IDE integrations.
- **frai-eval**
  - Bias/toxicity metrics, regression harness, dataset loaders.
  - CLI and programmatic API for evaluations.
- **frai-plugins**
  - Official detector packs (LangChain, Anthropic, OSS models); published as separate npm modules.

## Shared Utilities
- `packages/frai-core/src/shared/` for logging, error handling, metrics.
- `packages/frai-core/src/providers/` for AI model integrations (OpenAI, Anthropic, local models).
- `packages/frai-core/src/templates/` storing markdown/HTML templates with override mechanism.
- `packages/frai-core/src/scanners/` for language-specific detectors with plugin hooks.

## Testing Strategy
- Unit tests per package using Vitest/Jest with shared config in root.
- Integration tests in `packages/frai-cli` covering end-to-end command flows using fixture projects (from `examples/`).
- Contract tests between packages to ensure schema compatibility (e.g., document models, scan results).

## Build & Release
- Use pnpm workspaces + Turborepo for task orchestration.
- Semantic-release per package; maintain compatibility matrix in `docs/releases.md`.
- GitHub Actions workflows:
  - `ci.yml`: lint + test + build across packages.
  - `release.yml`: semantic-release after CI success.
  - `nightly.yml`: run evaluation regression tests.

## Migration Plan (High-Level)
1. Move `frai.mjs` logic into `packages/frai-core/src` modules (config, questions, generators, scanners).
2. Create `packages/frai-cli` that imports core modules and exposes bin.
3. Update root `package.json` to workspace mode (pnpm) while keeping current npm package publishing via `frai-cli`.
4. Incrementally introduce `frai-rag` and `frai-eval` packages as features mature.
5. Deprecate legacy `frai.mjs` once CLI package is stable and documented.

## Dependency Graph
- `frai-cli` → `frai-core`
- `frai-rag` → `frai-core`
- `frai-eval` → `frai-core`
- `frai-plugins/*` → `frai-core` (plugin contracts)
- IDE bindings (`frai-vscode`) → `frai-core`, optional → `frai-rag` / `frai-eval`
- Python bindings → `frai-core` via shared schemas (generated JSON)

All packages depend on shared schemas exported from `frai-core`. No package should import CLI-specific utilities.

## Service Layering Overview
- **Presentation Layer:** CLI, IDE extensions, CI integrations.
- **Application Layer:** Command handlers inside `frai-cli`, orchestration services in `frai-rag` / `frai-eval`.
- **Domain Layer:** Questionnaire engine, scan engine, document builders, evaluation metrics (within `frai-core`).
- **Infrastructure Layer:** File system adapters, AI providers, vector store drivers, HTTP clients.

## Data Flow Examples
1. CLI interactive session:
   - `frai-cli` command handler → `frai-core` questionnaire service → collects answers → passes to document generator → writes artefacts via file adapter.
2. RAG indexing:
   - `frai-cli` `rag index` command → `frai-rag` orchestrator → loads policies via `frai-core` document API → embeds with provider adapter → stores vectors via driver.
3. Evaluation run:
   - `frai eval` command → `frai-eval` metrics pipeline → fetches model outputs/logs via `frai-core` interfaces → executes metrics → returns structured report to CLI/IDE.

## Contract Surfaces
- `frai-core` exports:
  - `ConfigService` (load/validate configs)
  - `QuestionnaireService` (prompts, defaults, schema)
  - `DocumentService` (generate markdown/pdf)
  - `ScanService` (register detectors, run scans, return findings)
  - `AIProvider` interface (generate summaries, recommendations)
- `frai-rag` adds:
  - `IndexService`, `QueryService`, embeddings driver abstraction
- `frai-eval` adds:
  - `MetricRunner`, `ReportFormatter`, dataset loader interfaces

All services return typed DTOs shared via `/schemas` to maintain cross-language compatibility (Node/Python).

# Refactor Execution Plan (Phase 0)

## Objectives
- Modularise the existing CLI into reusable core services.
- Establish engineering tooling (lint, tests, CI) to support AI-focused feature expansion.
- Preserve current functionality (questionnaire, scanning, document generation) while preparing for RAG, evaluation, and guardrail modules.

## Task Breakdown

### 1. Workspace Setup
- ✅ Introduce `pnpm-workspace.yaml` and convert root `package.json` to workspace mode.
- ✅ Create `packages/frai-core` and `packages/frai-cli` with placeholder `package.json` files.
- ✅ Configure shared `tsconfig.json` (or `jsconfig` with JSDoc) for typed interfaces.

### 2. Module Extraction
- ✅ Move configuration + environment handling into `frai-core/src/config`.
- ✅ Extract questionnaire prompts, answer mapping, and validation into `frai-core/src/questionnaire`.
- ✅ Relocate document templates/builders into `frai-core/src/documents` with override support.
- ✅ Refactor scanning heuristics into `frai-core/src/scanners` with plugin registry pattern.
- ✅ Implement AI provider abstraction (`frai-core/src/providers`) supporting OpenAI + future adapters with comprehensive test coverage.
  - Provider registry system with factory pattern
  - OpenAI provider with chat completion API
  - Error handling and response parsing
  - Full test coverage with mocked fetch
  - Export integration in main index.js

### 3. AI Feature Delivery
- ✅ Assemble AI feature backlog (Day 8) with prioritised user stories (RAG, eval, fine-tune).
- ✅ Implement compliance-aware RAG toolkit (frai-rag).
- ✅ Build evaluation harness (frai-eval).
- [ ] Design fine-tuning governance schema (frai-finetune).

### 4. CLI Rebuild
- [ ] Build new CLI entry using `commander` (or similar) within `frai-cli/src/index.ts`.
- [ ] Re-implement existing commands (`frai`, `--scan`, `--setup`, etc.) by delegating to `frai-core`.
- [ ] Add structured logging/output formatting and consistent error handling.

### 5. Tooling & Quality Gates
- [ ] Configure ESLint + Prettier across workspace.
- [ ] Add Vitest/Jest test suites for questionnaire, documents, scanners, and CLI integration.
- [ ] Set up GitHub Actions CI for lint/test matrix.
- [ ] Introduce coverage thresholds (minimum 80% for core modules) and document testing strategy.

### 6. Release & Documentation
- [ ] Update README files to reflect new workspace layout and usage.
- [ ] Provide migration notes for users upgrading from legacy `v1.1.x`.
- [ ] Tag `v1.2.0-alpha` from new CLI; collect feedback before stable release.

## Dependencies & Considerations
- Ensure CLI binary remains `frai` for backwards compatibility (symlink legacy entry until new CLI published).
- Maintain compatibility with Node >=16; consider Node >=18 for future features using fetch API.
- Document any breaking change candidates (e.g., config file locations) ahead of 1.2 GA.

## Exit Criteria for Phase 0
- New workspace builds and tests green in CI.
- CLI parity confirmed via regression tests.
- Core modules ready for integration with upcoming RAG/eval/guard packages.

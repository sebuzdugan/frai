# FRAI Open Source Roadmap

## Overview
- Mission: deliver a modular, contribution-friendly responsible AI toolkit spanning CLI, SDKs, guardrails, RAG workflows, and evaluation pipelines.
- Strategy: refactor the existing `frai` package into a monorepo of reusable modules, layer advanced AI/ML/NLP capabilities, and ship polished developer tooling (CLI, SDKs, VS Code extension, Docker images).
- Boundary: keep core compliance workflows open source while allowing optional hand-offs to the commercial FRAI SaaS.

## Guiding Engineering Principles
- Favour small, composable modules with clear contracts (SOLID, clean architecture).
- Maintain full test coverage for new logic; TDD for critical scanners and generators.
- Ship with observable metrics and telemetry opt-in to validate user value.
- Bias toward DX excellence (typed APIs, docs, examples) to reduce integration friction.
- Prioritise AI features that solve concrete governance, audit, and safety pain points for practitioners.

## Day-by-Day Plan (First 14 Days)

### Week 1 – Restructure & Baseline
- ✅ **Day 1:** Run repository inventory, document current architecture, capture CLI behaviour; store findings in `docs/analysis.md`.
- ✅ **Day 2:** Finalise target monorepo design, module contracts, and dependency graph; draft `docs/architecture-target.md`.
- ✅ **Day 3:** Initialize pnpm/Turborepo workspace, scaffold `packages/frai-core` & `packages/frai-cli`, configure shared lint/test setup.
- ✅ **Day 4:** Port configuration & environment handling into `frai-core` modules; create unit tests for config loaders.
- ✅ **Day 5:** Migrate questionnaire logic and answer validation into `frai-core`; add Jest/Vitest coverage for prompt flows.
- ✅ **Day 6:** Extract document generators/templates, implement override mechanism, and add snapshot tests.
- ✅ **Day 7:** Build modular scanning engine with pluggable detectors; run integration tests using `examples/` fixtures.

### Week 2 – AI Feature Foundations & Tooling
- **Day 8:** Assemble AI feature backlog with user stories; prioritise RAG, eval, fine-tuning governance; publish roadmap entries.
- **Day 9:** Implement `frai rag index` command, vector store abstraction, and RAG helper modules; cover with CLI tests.
- **Day 10:** Scaffold `frai eval` baseline metrics leveraging open-source models; ensure configurable thresholds and reporting.
- **Day 11:** Draft fine-tuning governance spec (dataset audit, training hooks, bias evals); prototype config schema.
- **Day 12:** Develop VS Code MCP endpoint + extension scaffold reading data from `frai-core`; document protocol usage.
- **Day 13:** Author problem-solution playbooks (RAG compliance, LLM agent docs) in `/docs`; tie features to user pain points.
- **Day 14:** Add opt-in telemetry, gather KPIs (usage of new commands/tests), and produce sprint retrospective summary.

## Workstreams (Weeks 3-6)

### 1. Clean Architecture & Repo Structure (Weeks 0-2)
- Stand up pnpm/Turborepo monorepo with `packages/frai-cli` + `packages/frai-core`; migrate logic from `frai.mjs` into modular `/src` files.
- Add ESLint, Prettier, Vitest/Jest, and GitHub Actions for lint + test + coverage enforcement.
- Expose typed interfaces (TypeScript declarations or JSDoc) for generators, scanners, and template APIs.
- Publish `v1.2.0-alpha` showcasing the refactor; update README + CHANGELOG accordingly.

### 2. AI/ML/NLP Feature Foundations (Weeks 2-4)
- Modular scanner engine supporting multi-language detectors and pluggable NLP rule packs.
- Launch `frai-rag` helpers for policy/document vectorization and CLI command `frai rag index`.
- Implement `frai eval` baseline metrics (bias/toxicity) with extensible hooks; document sample configs.
- Design fine-tuning governance toolkit covering dataset audits, training hooks, and post-tuning checks.

### 3. Developer Experience & Distribution (Weeks 4-6)
- Release `frai-vscode` extension MVP with MCP integration, live checklists, and scan results.
- Package Docker images (`frai/cli`, `frai/eval`) and umbrella installers (`npx frai setup`, `pip install frai-suite`).
- Publish contributor guidelines, code of conduct, and Phase 1 roadmap issues to invite community participation.

## Feature Roadmap Highlights
- **frai-guard:** runtime guardrails for LLM responses (jailbreak detection, toxicity filters, provenance logging).
- **frai-rag:** compliance-aware RAG toolkit integrating LangChain/LangGraph, vector stores, and policy prompts.
- **frai-eval:** evaluation harness with reproducible notebooks, MCP endpoints, and regression dashboards.
- **frai-finetune:** responsible fine-tuning pipelines integrating dataset audits and post-hoc bias testing.
- **frai-templates & connectors:** starter apps, CI recipes, and marketplace for community scanners (`frai-plugin-*`).

## Packaging & Distribution
- npm: `frai`, `frai-cli`, `frai-core`, `frai-sdk-js`, guard/connector plugins.
- PyPI: `frai-sdk`, `frai-guard`, future evaluation/finetune helpers.
- IDE: VS Code marketplace (`frai-vscode`) and MCP packages for agentic IDE copilots.
- Containers: `frai/cli`, `frai/eval`, `frai/rag` images for CI/CD environments.
- Documentation: `docs/` site (Docusaurus/Mintlify) with tutorials, API references, and governance guides.

## Audience & Adoption Paths
- **Startup AI teams:** run `frai init`, integrate GitHub Action gates, iterate with VS Code extension.
- **Enterprise governance offices:** operate Dockerized checks, manage policy repositories, audit fine-tuning workflows.
- **Applied ML engineers:** embed SDKs in training pipelines, run `frai eval`, leverage MCP hints while developing.
- **Agentic workflow builders:** wire `frai-guard` and `frai-rag` into LangChain/LangGraph with MCP orchestration.
- **Partners & solution architects:** customize templates, publish connectors, deliver compliant proof-of-concepts.
- **Researchers & community contributors:** explore labs datasets, author new guardrails, and engage via RFCs.

## Next Actions
1. Create GitHub project board reflecting day-by-day tasks and broader workstreams; assign owners.
2. Complete repo analysis (Day 1/2 goals) and publish architecture blueprint in `docs/analysis.md`.
3. Execute monorepo migration (Days 3-7) with lint/test automation and alpha release.
4. Deliver AI feature prototypes (Days 8-14) focusing on concrete user problems documented in playbooks.
5. Schedule release cadence aligning npm, PyPI, VS Code, Docker, and MCP outputs; publish compatibility matrix.

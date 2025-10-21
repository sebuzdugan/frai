# AI Feature Backlog (Day 8)

## Objectives
- Prioritise high-impact AI/ML capabilities that align with FRAI's responsible AI mission.
- Ensure each feature has a clear user problem, desired outcome, and integration path with the new core modules.
- Feed roadmap entries into TODO and docs for execution in upcoming days.

## User Stories & Priorities

### 1. Compliance-Aware RAG Toolkit (frai-rag)
- **User Story:** As an applied ML engineer building RAG pipelines, I want FRAI to help me index compliance artefacts and surface policy snippets so my answers remain compliant.
- **Problems Solved:** Lack of consistent governance context in retrieval layers; difficulty triaging policy requirements.
- **MVP Scope:**
  - CLI command `frai rag index` to ingest policy/docs into vector stores (Pinecone, pgvector, Weaviate).
  - Core APIs to embed FRAI docs and provide prompt templates with compliance guardrails.
  - SDK hooks (JS/Python) for querying compliance-aware context.
- **Dependencies:** frai-core embeddings driver, vector store config, CLI command wiring.
- **Priority:** P0 (kick off in upcoming days).

### 2. Evaluation Harness (frai-eval)
- **User Story:** As a governance lead, I need automated bias/toxicity checks and regression tracking for models so I can sign off releases confidently.
- **Problems Solved:** Manual, ad-hoc evaluations; no regression history.
- **MVP Scope:**
  - CLI command `frai eval` with baseline metrics (bias, toxicity, hallucination).
  - Integration with open-source classifiers (Detoxify, Perspective API alternative, Fairlearn) with provider abstraction.
  - Exportable reports (JSON + Markdown) and hooks for CI.
- **Dependencies:** AI provider adapter layer, dataset fixtures, reporting templates.
- **Priority:** P0.

### 3. Fine-Tuning Governance Toolkit (frai-finetune)
- **User Story:** As an ML platform owner, I want guardrails for dataset audits, hyperparameter tracking, and post-finetune evaluations to ensure responsible releases.
- **Problems Solved:** No governance trail for finetuned models; inconsistent audits.
- **MVP Scope:**
  - Config schema for dataset provenance and approval workflows.
  - CLI flow to generate checklist/model card deltas for finetuned models.
  - Integration with evaluation harness to run post-finetune tests automatically.
- **Dependencies:** Evaluation harness, configuration module, doc generation upgrades.
- **Priority:** P1 (start design, implementation after RAG/eval).

### 4. MCP Integration Playbook
- **User Story:** As a developer using IDE copilots, I need FRAI to expose compliance checks via MCP so guardrails surface directly in my workflow.
- **Problems Solved:** Compliance context is disconnected from developer tools.
- **MVP Scope:**
  - MCP server wrapping frai-core scanner and questionnaire outputs.
  - VS Code extension commands calling MCP endpoints.
  - Documentation on registering FRAI MCP provider with third-party copilots.
- **Dependencies:** RAG/eval outputs, CLI commands, IDE packaging.
- **Priority:** P2 (design in parallel, implementation after core feature rollouts).

### 5. AI Risk Simulation Engine
- **User Story:** As a risk officer, I want to simulate impact scenarios based on FRAI policies so I can prioritise mitigations.
- **Problems Solved:** No quantitative view of policy impact and risk trade-offs.
- **MVP Scope:**
  - Scenario engine consuming policy configs and generating risk scores.
  - Hooks into evaluation results to stress-test metrics.
  - Visualization templates (maybe static HTML) for stakeholders.
- **Dependencies:** Evaluation harness, policy schema, doc generation.
- **Priority:** P3 (longer-term backlog).

## Roadmap Integration
- Update TODO Week 2 entries with detail (Day 9 RAG implementation, Day 10 eval harness, Day 11 fine-tune governance spec, Day 12 MCP prototype, Day 13 playbooks, Day 14 telemetry).
- Link each P0/P1 feature to forthcoming Day tasks and create issues/epics in GitHub project board.
- Align with docs site: add backlog overview to `docs/roadmap` (to be created during docs workstream).

## Next Actions
1. Flesh out Day 9 task list based on RAG backlog (CLI command, vector store abstraction, tests).
2. Draft evaluation harness architecture notes feeding Day 10 deliverable.
3. For fine-tuning governance, start schema draft (Day 11) referencing evaluation outputs.

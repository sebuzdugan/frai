# LangChain FRAI Doc Concierge – Implementation Plan

## 1. Problem & Opportunity
- **Challenge:** Teams want the FRAI scan + documentation workflows but do not always remember CLI flags or wish to embed them inside chat surfaces (Slack, VS Code, internal portals).
- **Pain Point Today:** Manual CLI runs, context switching, repeated explanations for how to produce `checklist.md`, `model_card.md`, and `risk_file.md`.
- **Opportunity:** Wrap FRAI’s existing capabilities in a conversational agent so stakeholders can say “scan the repo and draft the docs,” then receive structured outputs instantly.

## 2. Success Criteria
- Single command (or exported module) that accepts natural-language prompts and triggers FRAI workflows via LangChain.
- Agent returns actionable artifacts: scan summary + generated documentation locations.
- Implementation fits existing repo patterns: TypeScript tooling, pnpm workspace, FRAI core APIs, documented in `docs/`.
- Tests or manual verification instructions demonstrate end-to-end execution.

## 3. High-Level Architecture
| Component | Purpose | Notes |
|-----------|---------|-------|
| LangChain Agent Executor | Orchestrates tool selection and execution. | Use OpenAI tool-calling agent for simplicity and reliability. |
| FRAI Tool Wrappers | Expose `scanRepo` and `generateDocs` as LangChain tools. | Thin adapters around `frai-core` APIs. |
| Memory / Context | Optional short-term conversation memory. | Keep initial version stateless to stay simple. |
| CLI Entrypoint | Provides easy invocation (`pnpm run agent:frai`). | Streams agent responses for good UX. |
| Config Layer | Reads FRAI + model keys (`.env`, CLI config). | Reuse existing config helpers where possible. |

## 4. Tech Choices
- **Language:** TypeScript (align with repo, type safety, shared configs).
- **Runtime:** Node.js ≥ 18 (already required).
- **Package Management:** pnpm workspace (existing).
- **LLM Provider:** OpenAI via `ChatOpenAI` (consistent with FRAI usage); provider is swappable.
- **Prompting:** LangChain’s `createOpenAIToolsAgent` with a concise system prompt describing responsibilities and guardrails.

## 5. Target Folder Structure
```
packages/
  frai-agent/
    package.json
    tsconfig.json (extends repo root)
    src/
      index.ts              # CLI entrypoint
      agent/
        prompt.ts           # System prompt + message templates
        executor.ts         # Agent creation + streaming helpers
      tools/
        scan-tool.ts        # Wrapper around Scanners.scanCodebase
        docs-tool.ts        # Wrapper around Documents.generateDocuments
      config/
        env.ts              # Key loading (reuse frai-core if possible)
      cli/
        run.ts              # Thin wrapper to execute agent from CLI command
    README.md               # Package usage doc (generated later)
```

## 6. Implementation Steps
1. **Scaffold Package**
   - Add `packages/frai-agent` workspace with TypeScript config (extends root settings).
   - Declare dependencies: `frai-core`, `langchain`, `@langchain/openai`, `zod`, `tsx` (for dev run), and shared lint configs.
2. **Environment Handling**
   - Reuse FRAI config utilities if available; otherwise load `.env` + FRAI config to fetch OpenAI API key.
   - Validate presence of `OPENAI_API_KEY`; guide user on setup.
3. **Tool Adapters**
   - `scan-tool.ts`: Accept optional `path`, call `Scanners.scanCodebase({ cwd: path ?? process.cwd() })`, return structured summary (counts, flags, high-risk indicators, raw JSON path).
   - `docs-tool.ts`: Accept optional `path` and `overwrite` flag; call `Documents.generateDocuments`; return paths to outputs (`checklist.md`, `model_card.md`, `risk_file.md`).
   - Define input/output schemas with `zod`, register as LangChain tools via `tool()` helper.
4. **Agent Construction**
   - `prompt.ts`: system message (mission, guardrails, fallback behavior).
   - `executor.ts`: instantiate `ChatOpenAI` (model default `gpt-4.1-mini` or `gpt-4o-mini`), pass tools to `createOpenAIToolsAgent`, wrap in `AgentExecutor`.
   - Provide helper `runAgent(input: string)` returning final text + intermediate tool outputs.
5. **CLI Interface**
   - `cli/run.ts`: parse command-line input (`pnpm agent:frai "scan the repo"`), call `runAgent`, stream tokens or print steps.
   - Handle empty input by prompting user for interactive question.
6. **DX Enhancements**
   - Add npm script in root (`"agent:frai": "pnpm --filter frai-agent exec pnpm start"`).
   - Document usage in new package README (created in `packages/frai-agent/README.md`).
7. **Testing & Verification**
   - Manual smoke test instructions in this README.
   - Optionally add automated test with mocked FRAI APIs (stretch goal).
8. **Documentation**
   - Update `docs/langchain-agent/README.md` (this file) with validation steps once implemented.
   - Summarize in root `README.md` under “Integrations” (follow-up PR).

## 7. User Flow
1. User installs dependencies (`pnpm install` already covers new package).
2. Ensure `OPENAI_API_KEY` configured (via `frai setup --global` or `.env`).
3. Run `pnpm agent:frai "<request>"`.
4. Agent may call `scanRepo` (returns summary) and/or `generateDocs` (writes docs).
5. CLI prints actionable output with file paths and next steps.

## 8. UX Guidelines
- Print clear status messages before/after tool calls.
- Surface document paths relative to repo root.
- On errors (missing key, scan failure), show friendly guidance.
- Keep responses concise; highlight high-risk findings and doc paths.

## 9. Validation Checklist
- [ ] `pnpm agent:frai "scan the repo"` returns scan summary without error.
- [ ] `pnpm agent:frai "generate the docs"` creates/updates documentation files.
- [ ] Combined instruction triggers sequential tool usage.
- [ ] CLI handles invalid prompts gracefully (responds with guidance).
- [ ] Works from any repo subdirectory when `--cwd` option provided (stretch goal).

### Manual Validation Hints
- Configure `OPENAI_API_KEY` via `frai setup` or by exporting an environment variable before running the agent.
- Run `pnpm agent:frai "scan the repository for AI indicators"` to exercise the scan tool.
- For documentation, provide structured answers:  
  ```bash
  pnpm agent:frai "Generate documentation with this context: {\"answersJson\": \"{...}\"}"
  ```  
  In interactive mode, the agent will prompt for missing sections if the JSON is incomplete.
- Use `pnpm agent:frai --interactive` for a multi-turn session and `--verbose` to inspect tool input/output pairs.

## 10. Future Enhancements
- Add memory (LangChain `BufferMemory`) for multi-turn chats.
- Support additional tools (`rag` indexing, `eval` reports).
- Publish as reusable library or Slack bot (wrap CLI script).
- Introduce tests with mock LangChain tools for CI determinism.

## 11. Open Questions
- Do we reuse FRAI CLI logging utilities for consistent style?
- Should generated docs automatically open diff viewer or just print paths?
- How do we handle long-running scans (progress updates, spinners)?

This plan keeps the implementation lightweight, leverages existing FRAI-core capabilities, and delivers a high-impact productivity win through a conversational interface.



• Shipped a new frai-agent workspace that wraps FRAI scans and docs generation behind a LangChain-powered CLI and tools.

  - packages/frai-agent/src/cli/run.ts:1 – added single-turn and interactive REPL entrypoint with --model, --verbose, and tool
    logging.
  - packages/frai-agent/src/tools/scan-tool.ts:10 – exposed scan_repository LangChain tool returning concise AI indicator summaries.
  - packages/frai-agent/src/tools/docs-tool.ts:28 – added generate_responsible_ai_docs tool that parses questionnaire JSON, writes
    FRAI markdown, and respects overwrite flags.
  - packages/frai-agent/src/agent/executor.ts:22 & src/agent/prompt.ts:1 – wired ChatGPT-based tool-calling agent with guardrails
    plus helper exports for reuse.
  - packages/frai-agent/src/config/env.ts:10 – reused FRAI key-store logic to resolve OPENAI_API_KEY automatically.
  - packages/frai-agent/package.json:1, tsconfig.json:1, README.md:1 – scaffolded package metadata, TypeScript config, and usage
    docs; root package.json:10 now exposes pnpm agent:frai.
  - docs/langchain-agent/README.md:51 – refreshed implementation plan with actual DX steps and validation hints.

  Tests not run: new dependencies (langchain, @langchain/openai, tsx) aren’t installed in this sandbox.

  Next steps:

  1. pnpm install (or pnpm install --filter frai-agent...) to pull new dependencies and update the lockfile.
  2. Validate: pnpm agent:frai "scan the repository for AI indicators" and try --interactive --verbose to inspect tool calls.
  3. Provide full questionnaire JSON in a prompt to confirm docs generation writes checklist.md, model_card.md, and risk_file.md.

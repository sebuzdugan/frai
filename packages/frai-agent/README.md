# FRAI Agent

LangChain-powered concierge that wraps FRAI scanning and documentation workflows behind a conversational interface.

## Features
- `scan_repository` tool wraps `Scanners.scanCodebase` to surface AI indicators in the current repo.
- `generate_responsible_ai_docs` tool wraps `Documents.generateDocuments` to write `checklist.md`, `model_card.md`, and `risk_file.md`.
- CLI entry point with single-turn and interactive modes (`pnpm agent:frai --interactive`).
- Re-uses FRAI configuration to discover `OPENAI_API_KEY` from `.env` or global config.

## Getting Started
1. Install dependencies (requires network access the first time):
   ```bash
   pnpm install
   ```
2. Configure an OpenAI key via FRAI tooling or environment variables:
   ```bash
   frai setup --global  # or export OPENAI_API_KEY=...
   ```
3. Run the agent:
   ```bash
   pnpm agent:frai "Scan the repo and summarise AI risks."
   ```

## Interactive Mode
Launch a chat-style session and inspect tool calls:
```bash
pnpm agent:frai --interactive --verbose
```
Use `exit`, `quit`, or `:q` to leave the REPL.

## Providing Questionnaire Answers
Document generation requires the FRAI questionnaire structure:
```bash
pnpm agent:frai "Generate the docs with these answers: {
  \"core\": { \"name\": \"ReviewCopilot\", \"purpose\": \"assistant\", \"dataType\": \"personal\" },
  \"impact\": { \"stakeholders\": [\"developers\"], \"impactLevel\": \"medium\" },
  \"data\": { \"sources\": [\"internal docs\"], \"retention\": \"30 days\" },
  \"performance\": { \"metrics\": [\"accuracy\"], \"evaluation\": \"manual\" },
  \"monitoring\": { \"strategy\": \"daily review\", \"owners\": [\"ai-team\"] },
  \"bias\": { \"mitigations\": [\"red teaming\"], \"openConcerns\": \"none\" }
}"
```
The agent will parse the JSON snippet, call the documentation tool, and report which files were written.

## API Usage
```ts
import { createFraIAgentExecutor } from "frai-agent";

const executor = await createFraIAgentExecutor();
const result = await executor.invoke({ input: "scan the repository" });
console.log(result.output);
```

## Next Steps
- Add additional FRAI tools (RAG indexing, evaluation reports).
- Persist conversation memory across turns.
- Write automated smoke tests with mocked LangChain tools.

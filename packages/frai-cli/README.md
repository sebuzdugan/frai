<div align="center">

<pre>

 ███████████ ███████████     █████████   █████
░░███░░░░░░█░░███░░░░░███   ███░░░░░███ ░░███ 
 ░███   █ ░  ░███    ░███  ░███    ░███  ░███ 
 ░███████    ░██████████   ░███████████  ░███ 
 ░███░░░█    ░███░░░░░███  ░███░░░░░███  ░███ 
 ░███  ░     ░███    ░███  ░███    ░███  ░███ 
 █████       █████   █████ █████   █████ █████
░░░░░       ░░░░░   ░░░░░ ░░░░░   ░░░░░ ░░░░░ 
                                 
</pre>

</div>

# FRAI · Framework of Responsible Artificial Intelligence

![npm version](https://img.shields.io/npm/v/frai)
![npm downloads](https://img.shields.io/npm/dt/frai)


**One command tells you whether your product is legal about saying it uses AI.**

```bash
npx frai
```

No key, no signup, no flags. In any repo, `frai` scans your code for AI, finds your public URL by
itself, asks [frai.cc](https://frai.cc) whether that site tells people about its AI, runs the gate if you
have a spec, and prints the one thing to do next.

```
FRAI review: support-app

Code
  AI found  3 files using openai
    src/support/reply.ts

Site
  https://support.example.com/  needs a notice
    Chat tool found. No AI disclosure found.
    found: Intercom

Spec
  FRAI-SPEC.md  BLOCK
    Human oversight · Escalation path needs your answer: Can a human agent take over before the AI replies?

Next
  answer the 4 open fields in FRAI-SPEC.md, then: npx frai gate check FRAI-SPEC.md
```

## The four commands

| Command | What it does |
|---------|--------------|
| `frai` | Review this project. `--ci` exits 1 when something needs fixing, `--json` prints it as JSON, `--offline` skips the site check, `--url <url>` overrides the detected site. |
| `frai check [url]` | Check any site, no repo and no key. Bare domains are fine: `frai check example.com`. |
| `frai init` | Add `FRAI-SPEC.md` and the GitHub Action that runs the gate on every PR. |
| `frai draft` | Fill the gate answers from your own code, then write them into the spec. |

### What each one does behind the scenes

`frai` finds your site the way a colleague would: `homepage` in `package.json`, then
`NEXT_PUBLIC_SITE_URL` / `SITE_URL` / `APP_URL` in `.env*`, then the first real link in the README.
Hidden directories, `node_modules`, and build output are skipped, so the file list is your code.

`frai draft` prefers your local Claude agent (Claude Code login or `ANTHROPIC_API_KEY`), because that
reads the whole repo and nothing leaves the machine. Without a key it falls back to the hosted drafter
on frai.cc and asks first, listing the files it would send. Where your code does not show the answer it
writes `NEEDS HUMAN INPUT: <the question>` instead of inventing one, and the gate BLOCKs until a person
answers it.

### In CI

```yaml
- run: npx frai --ci
```

Exits 1 when the live site is missing a notice, the gate BLOCKs, or AI code has no spec at all.

---

## Everything else

FRAI also ships the original documentation toolkit and the SDK behind it:

- `frai` – the command-line app.
- `frai-core` – the reusable SDK (`Questionnaire`, `Documents`, `Scanners`, `Rag`, `Eval`, `Finetune`, `Config`, `Providers`).

Install:

```bash
npm install -g frai
```

Generated artefacts land in your working directory. An OpenAI key is optional and only adds AI-written
tips to the generated docs: `frai setup`, or set `OPENAI_API_KEY`.

---

## CLI Command Reference

| Command | Purpose |
|---------|---------|
| `frai [options]` | Review the project (see above). Legacy flags such as `--scan` or `--setup` still run the old workflow. |
| `frai review` / `frai check [url]` / `frai init` / `frai draft` | The four commands above. |
| `frai gate init \| check <spec> [--smart] \| draft` | The Responsible AI Gate, bundled from `frai-gate`. |
| `frai generate [options]` | Interactive documentation workflow. |
| `frai scan [--ci] [--json]` | Scan the repository for AI/ML indicators. |
| `frai setup [--key <apiKey>] [--global]` | Store an OpenAI API key locally or globally. |
| `frai config` | Show key configuration status. |
| `frai docs list` / `frai docs clean` / `frai docs export` | Manage generated documentation. |
| `frai rag index [options]` | Build a local compliance-aware vector index. |
| `frai eval --outputs <file> [...]` | Run baseline evaluation metrics and write reports. |
| `frai finetune template` / `frai finetune validate <plan>` | Create or validate fine-tuning governance plans. |
| `frai update` | Check npm for the latest CLI release. |

### Default Command: `frai [options]`
Runs the review. Passing any legacy flag runs the old interactive documentation flow instead:
- `--scan` – run code scanning before questions.
- `--ci` – exit after scanning when no AI indicators are detected.
- `--setup` – jump directly into key configuration.
- `--key <apiKey>` / `--global` – provide a key and optionally persist it globally.
- `--list-docs` / `--clean` – list or remove generated docs.
- `--export-pdf` – convert generated markdown to PDFs (requires `markdown-pdf`).
- `--show-config` – display key storage status.
- `--update` – check npm for a newer CLI version.

### `frai generate [options]`
Same workflow as the default command, but scoped to documentation only. Options mirror the defaults: `--scan`, `--ci`, `--key`, `--global`, `--export-pdf`, and `--show-config`.

### `frai scan`
Scans the repository for AI-related libraries, functions, and files. Use `--ci` for non-interactive mode or `--json` to emit raw JSON.

### `frai setup`
Guided API key storage. Supply `--key <apiKey>` for headless use and `--global` to persist at `~/.config/frai/config`.

### `frai config`
Prints whether local (`.env`) or global configuration holds an API key.

### `frai docs`
Utilities for generated artefacts:
- `frai docs list` – list detected `checklist.md`, `model_card.md`, and `risk_file.md`.
- `frai docs clean` – delete generated docs.
- `frai docs export` – export docs to PDF via `markdown-pdf`.

### `frai rag index [options]`
Create a lightweight JSON vector store for compliance policies.
- `--input <path>` – file or directory to index (defaults to cwd).
- `--output <path>` – target JSON file (defaults to `frai-index.json`).
- `--chunk-size <words>` – words per chunk (default 800).
- `--extensions <a,b,c>` – allowlisted extensions (default `.md,.markdown,.txt,.json,.yaml,.yml`).

### `frai eval`
Generate evaluation reports for model outputs.
- `--outputs <file>` *(required)* – JSON file with model outputs.
- `--references <file>` – JSON file with reference answers.
- `--report <path>` – output location (`frai-eval-report.json` by default).
- `--format <json|markdown>` – output format (defaults to JSON). Markdown reports include human-readable summaries for review boards.

### `frai finetune`
Fine-tuning governance helpers:
- `frai finetune template [--output <path>]` – write a governance template JSON (`frai-finetune-plan.json` by default).
- `frai finetune validate <plan> [--readiness]` – validate a plan and optionally print readiness checkpoints and summaries.

### `frai update`
Check npm for the latest `frai` release and print upgrade instructions.

---

## Using `frai-core` (SDK)

Install from npm:
```bash
pnpm add frai-core
```

`frai-core` exposes modular helpers that the CLI uses under the hood:
- `Questionnaire` – interactive question flows.
- `Documents` – generate checklists, model cards, and risk files.
- `Scanners` – static analysis for AI indicators.
- `Rag` – policy-grounded indexing utilities.
- `Eval` – baseline evaluation metrics and report writers.
- `Finetune` – governance templates, validation, and readiness scoring.
- `Config` & `Providers` – key management and LLM provider wiring.

Example: generate documentation programmatically.

```ts
import fs from 'fs/promises';
import inquirer from 'inquirer';
import { Documents, Questionnaire, Scanners } from 'frai-core';

const answers = await Questionnaire.runQuestionnaire({
  prompt: (questions) => inquirer.prompt(questions)
});

const { checklist, modelCard, riskFile } = Documents.generateDocuments({ answers });
const scan = Scanners.scanCodebase({ root: process.cwd() });
const aiContext = Documents.buildContextForAITips(answers);

await fs.writeFile('checklist.md', checklist);
await fs.writeFile('model_card.md', modelCard);
await fs.writeFile('risk_file.md', riskFile);
await fs.writeFile('scan-summary.json', JSON.stringify(scan, null, 2));
await fs.writeFile('ai-context.txt', aiContext);
```

Because `frai-core` is a regular ESM package, you can import only the modules you need and embed FRAI capabilities inside automation pipelines, CI jobs, or custom products.

---

## Local Development

Clone the repository and work from source:
```bash
pnpm install
pnpm --filter frai run build
node packages/frai-cli/dist/index.js --help
```

During development you can install the CLI locally without publishing:
```bash
pnpm install --global ./packages/frai-cli
# then
frai --setup
```

Store your OpenAI key by running the CLI setup flow or setting `OPENAI_API_KEY` in `.env`.

---

## Publishing (Maintainers)

FRAI ships as two npm packages and they must be published independently.

1. Bump versions in `packages/frai-core/package.json` and `packages/frai-cli/package.json`. Update the CLI dependency to match the published `frai-core` version (drop `workspace:*`).
2. Build the CLI:  
   ```bash
   pnpm --filter frai run build
   ```
3. Publish `frai-core` first, then `frai`:  
   ```bash
   cd packages/frai-core && npm publish
   cd ../frai-cli   && npm publish
   ```
4. Verify on npm:  
   ```bash
   npm view frai versions --json
   npm view frai-core versions --json
   ```

---

## Learn More
- Website: [frai.cc](https://frai.cc)
- NPM package: [frai](https://www.npmjs.com/package/frai)
- docs/ai_feature_backlog.md – roadmap for AI capabilities.
- docs/eval_harness_design.md – evaluation harness design notes.
- docs/architecture-target.md – monorepo architecture.

*Framework of Responsible Artificial Intelligence*

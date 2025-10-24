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

FRAI (Framework of Responsible Artificial Intelligence) is an open-source toolkit that helps any team — from solo developers to compliance officers — ship AI features responsibly. It walks you through quick questions, scans your code, and generates documentation you can actually hand to stakeholders: implementation checklists, model cards, risk files, evaluation reports, and policy-aware RAG indexes.

Think of FRAI as a safety net for AI launches: it collects the right facts, highlights blind spots, and keeps evidence tidy so production reviews stop feeling like guesswork.

## 🚀 Getting Started

**1. Install FRAI globally:**
```bash
npm install -g frai
```

**2. Set up your OpenAI API key (required for AI-powered tips):**
```bash
frai --setup
```
You only need to do this once per machine or project. Your key is stored securely and never shared.

**3. Run FRAI in your project:**
```bash
frai
```

> **Tip:** `frai` is available globally after installing the published npm package. If you're working from a local clone, follow the steps in [Local Development](#-local-development) to run the CLI from source.

---

## 🛠️ CLI Commands & Features

| Command                | Description |
|------------------------|-------------|
| `frai`                 | Interactive mode for documenting an AI feature (8-question progressive system) |
| `frai --scan`          | Scan codebase for AI/ML code and generate docs |
| `frai --setup`         | Set up your OpenAI API key (local/global) |
| `frai --ci`            | Run in CI mode (non-interactive) |
| `frai --help`, `-h`    | Show help and usage info |
| `frai --version`, `-v` | Show current version |
| `frai --update`        | Check for new versions of FRAI |
| `frai --list-docs`     | List generated documentation files |
| `frai --clean`         | Remove generated documentation files |
| `frai --export-pdf`    | Export documentation markdown files as PDFs |
| `frai --show-config`   | Show API key config status |
| `frai --key=API_KEY`   | Provide OpenAI API key directly (one-off use) |
| `frai --global`        | Use with --setup to save API key globally |
| `frai rag index`       | Index compliance docs into a local vector store |
| `frai eval`            | Run baseline evaluation metrics and write reports |

### RAG Indexing

```bash
frai rag index --input docs/policies --output .frai/compliance-index.json --chunk-size 400
```
- Scans `.md`, `.txt`, `.json`, `.yaml` files recursively.
- Generates a lightweight JSON vector store consumable by SDKs and future connectors.

### Evaluation Harness

```bash
frai eval --outputs runs/outputs.json --references runs/golden.json --report reports/eval --format markdown
```
- Runs baseline metrics (exact match, toxicity keyword scan, length variance).
- Produces JSON and/or Markdown summaries for CI and governance reviews.

**Docs generated:**
- `checklist.md`      — Implementation checklist
- `model_card.md`     — Model card
- `risk_file.md`      — Risk & compliance

---

## 💡 Features
- **Progressive 8-question system**: Context-aware, fast, and actionable
- **AI-powered recommendations**: Get tailored tips for responsible AI
- **Comprehensive documentation**: Checklist, model card, and risk file
- **PDF export**: Convert docs to PDF with one command
- **Codebase scanning**: Detects AI/ML code and generates relevant docs
- **Easy setup**: One-time API key configuration
- **Compliance-aware RAG**: Build vector stores from policies for knowledge-grounded guardrails
- **Evaluation harness**: Run baseline metrics and capture auditable reports

### Monorepo Layout

```
frai/
├─ packages/
│  ├─ frai-cli/      # CLI entry point and command wiring
│  └─ frai-core/     # Reusable services (config, questionnaire, documents, scanners, RAG, eval)
├─ docs/             # Roadmaps, design notes, and feature backlogs
└─ examples/         # Sample AI projects used in tests and demos
```

---

## 🔑 API Key Setup
FRAI requires an OpenAI API key for generating AI-powered tips and documentation. Run:
```bash
frai --setup
```
If you skip this step, FRAI will prompt you to set up your key on first use.

---

## 🧑‍💻 Local Development

Run FRAI directly from this repository without publishing:

```bash
pnpm install
pnpm --filter frai run build
node packages/frai-cli/dist/index.js --help
```

### Configure an OpenAI key from source

- Interactive CLI:
  ```bash
  node packages/frai-cli/dist/index.js --setup YOUR_KEY
  ```
- Manual `.env`:
  ```
  OPENAI_API_KEY=YOUR_KEY
  ```

To test the global binary locally (without npm publishing), install the workspace package:

```bash
pnpm install --global ./packages/frai-cli
# then:
frai --setup
```

---

## 📖 Learn More
- [GitHub Repository](https://github.com/sebastianbuzdugan/frai)
- [NPM Package](https://www.npmjs.com/package/frai)
- [AI Feature Backlog](docs/ai_feature_backlog.md)
- [Evaluation Harness Design](docs/eval_harness_design.md)

---

*Generated by FRAI - Responsible AI in Minutes* 

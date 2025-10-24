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
![npm version core](https://img.shields.io/npm/v/frai-core)
![npm downloads](https://img.shields.io/npm/dt/frai)

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

### Package Architecture

FRAI uses a **monorepo structure** with two separate npm packages for optimal flexibility and reusability:

#### 📦 `frai-cli` (Main CLI Tool)
- **Purpose**: Command-line interface for end users
- **Published as**: `npm install -g frai`
- **Contains**: CLI commands, user interface, documentation generators
- **Depends on**: `frai-core@^0.0.1`

#### 📦 `frai-core` (Core Library)
- **Purpose**: Reusable services and utilities
- **Published as**: `npm install frai-core`
- **Contains**: Configuration, questionnaires, document generators, scanners, RAG, evaluation
- **Used by**: CLI and potentially other tools/projects

#### Why Two Packages? 🤔

**✅ Benefits of Separate Publishing:**
- **Independent versioning**: Core can evolve without breaking CLI compatibility
- **Reusability**: Other developers can use `frai-core` in their own tools
- **Smaller packages**: Users only download what they need
- **Better dependency management**: Clear API boundaries and contracts
- **Ecosystem growth**: Core can be used in SDKs, plugins, web interfaces

**❌ Problems with Single Package:**
- **Bloat**: CLI users download core dependencies they don't need
- **Coupling**: Everything tied to single version number
- **Limited reuse**: Hard for other projects to use just the core functionality
- **Maintenance complexity**: One change affects entire ecosystem

**This is industry standard!** Examples:
- React has `react` + `react-dom` + `@types/react`
- Vue has `vue` + `@vue/compiler-sfc`
- Webpack has many `@webpack/*` scoped packages

#### Monorepo Layout

```
frai/
├─ packages/
│  ├─ frai-cli/      # CLI package (published as 'frai')
│  │  ├─ src/       # TypeScript source code
│  │  ├─ dist/      # Compiled JavaScript (published)
│  │  ├─ README.md  # CLI documentation (published)
│  │  └─ package.json
│  └─ frai-core/     # Core library (published as 'frai-core')
│     ├─ src/       # ES modules (published as-is)
│     ├─ README.md  # Library documentation (published)
│     └─ package.json
├─ docs/             # Roadmaps, design notes, feature backlogs
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

## 🚀 Publishing & Deployment

FRAI uses a monorepo with two separate npm packages that need to be published independently.

### Publishing Process

**1. Update versions in package.json files:**
```bash
# Update CLI version (in packages/frai-cli/package.json)
# Update Core version (in packages/frai-core/package.json)
```

**2. Build the CLI package:**
```bash
cd packages/frai-cli
pnpm build  # Compiles TypeScript to dist/
```

**3. Publish both packages:**
```bash
# Publish core first (CLI depends on it)
cd packages/frai-core
npm publish

# Then publish CLI
cd packages/frai-cli
npm publish
```

**4. Verify publication:**
```bash
npm view frai versions --json
npm view frai-core versions --json
```

### Package Publishing Order

**Important:** Always publish `frai-core` first, then `frai-cli` because:
- CLI depends on the specific core version
- npm needs the core package to exist before CLI can reference it
- This ensures dependency resolution works correctly

### Version Management

- **frai-core**: Library package, can evolve independently
- **frai-cli**: Application package, depends on specific core version
- **Semantic versioning**: Use appropriate version bumps based on changes

### Publishing Checklist

- [ ] Update version numbers in both package.json files
- [ ] Update CLI dependency to reference published core version (not workspace:*)
- [ ] Run tests: `pnpm test`
- [ ] Build CLI: `cd packages/frai-cli && pnpm build`
- [ ] Commit all changes with descriptive message
- [ ] Publish frai-core first: `cd packages/frai-core && npm publish`
- [ ] Publish frai-cli: `cd packages/frai-cli && npm publish`
- [ ] Verify both packages appear correctly on npmjs.com
- [ ] Test installation: `npm install -g frai`

---

## 📖 Learn More
- [GitHub Repository](https://github.com/sebastianbuzdugan/frai)
- [CLI Package (frai)](https://www.npmjs.com/package/frai) - Main CLI tool
- [Core Package (frai-core)](https://www.npmjs.com/package/frai-core) - Reusable library
- [AI Feature Backlog](docs/ai_feature_backlog.md)
- [Evaluation Harness Design](docs/eval_harness_design.md)
- [Monorepo Architecture](docs/architecture-target.md)

---

*Generated by FRAI - Responsible AI in Minutes* 

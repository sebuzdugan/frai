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

# FRAI

![npm version](https://img.shields.io/npm/v/frai)
![npm downloads](https://img.shields.io/npm/dt/frai)

**The compliance check that lives in your CI.** Is your product legal about telling people AI is involved? FRAI blocks the build until you can prove it.

The sharpest example today is EU AI Act Article 50, enforceable since 2 August 2026: people must be told when they talk to an AI system or see AI-generated content. It is not the only rule FRAI asks about. The gate covers seven responsible-AI checks, from risk tier to monitoring.

![Screenshot of frai.cc, the FRAI web scanner.](assets/frai_cc_screenshot.png)

FRAI is open source. Start with one command, in any repo:

```bash
npx frai
```

No key, no signup, no flags. It scans your code for AI, finds your public URL by itself, asks
[frai.cc](https://frai.cc) whether that site tells people about its AI, runs the gate if you have a spec,
and prints the one thing to do next.

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

Four commands cover the whole job:

| Command | What it does |
|---------|--------------|
| `npx frai` | Review this project: code, live site, spec, next step. `--ci` exits 1 when something needs fixing. |
| `npx frai check yourcompany.com` | Check any site, with no repo and no key. |
| `npx frai init` | Add `FRAI-SPEC.md` and the GitHub Action that runs the gate on every PR. |
| `npx frai draft` | Fill the gate answers from your own code. Uses your local Claude agent if you have one, otherwise frai.cc does it, after asking. |

The drafter never guesses. Where your code does not show the answer it writes
`NEEDS HUMAN INPUT: <the question>`, and the gate BLOCKs until a person answers it.

---

## Quick start: add the gate to any repo

Works in any repo and any language. You need Node 18 or newer to run it.

```bash
npx frai-gate init --ci
```

This writes two files:

- `FRAI-SPEC.md`: a spec template with the FRAI Gate section built in.
- `.github/workflows/rai-gate.yml`: a GitHub Action that runs the gate on every pull request and every push to `main`.

Commit both. The build now fails until the spec is answered. Fill in the gate, then check it locally:

```bash
npx frai-gate check FRAI-SPEC.md
```

The check is deterministic. It needs no API key and no LLM.

<img src="assets/frai-gate-demo.gif" width="360" alt="frai-gate demo: BLOCK on empty answers, the agent drafts the gate from the code, PASS after fixes" />

### The seven checks

1. Risk tier (prohibited, high, limited, minimal). High risk needs a named human sign-off.
2. Data and privacy
3. Human oversight
4. Evaluation plan (needs numbers)
5. Bias and fairness
6. Monitoring and rollback (needs numbers)
7. Transparency and incidents (this is where AI disclosure goes)

Verdicts: `PASS` and `WARN` exit 0. `BLOCK` exits 1. Usage errors exit 2.

What the check does not do: it does not read your product or give legal advice. It checks that your spec answers each question with real content. Pair it with `--smart` or a human review to judge whether the answers are good.

### Let an agent draft the answers

Two commands use a read-only agent built on the Claude Agent SDK. They need Claude Code authentication or `ANTHROPIC_API_KEY`.

```bash
npx frai-gate draft                        # reads your code and drafts the gate section
                                           # with file:line citations (writes rai-gate-draft.md)
npx frai-gate check FRAI-SPEC.md --smart   # adds an AI review of vague or contradicted answers
```

Other flags: `init --out <file>`, `check --json`, `draft --out <file>`, `draft --print`. Set `FRAI_GATE_MODEL` to change the model.

### If you build with AI coding agents

```bash
npx skills add sebuzdugan/frai-skills
```

This installs the `responsible-ai-spec` skill. Specs your agent writes include the gate, and the agent may not self-approve high-risk features.

Worked example: [`examples/support-triage-demo/`](examples/support-triage-demo). Design notes: [`docs/rai-gate-design.md`](docs/rai-gate-design.md).

---

## Install the CLI

```bash
npm install -g frai
```

`frai` bundles the gate, so `frai gate init --ci`, `frai gate check FRAI-SPEC.md`, and `frai gate draft` work the same as the `npx frai-gate` commands above.

## Commands

| Command | What it does |
|---------|--------------|
| `frai` / `frai review` | Review the project: code scan, site check, gate, next step. |
| `frai check [url]` | Check whether a site tells people it uses AI. Exits 1 with `--ci` when a notice is missing. |
| `frai init` | Shorthand for `frai gate init --ci`. |
| `frai draft` | Draft the gate answers from your code, locally or via frai.cc. |
| `frai gate init [--ci]` | Write `FRAI-SPEC.md`. With `--ci`, also write the GitHub Action. |
| `frai gate check <spec> [--smart] [--json]` | Validate the gate section. Exits 1 on BLOCK. |
| `frai gate draft` | Draft gate answers from your code (Claude Agent SDK). |
| `frai scan [--ci] [--json]` | Regex scan for ML library imports and common AI function names. |
| `frai generate` | Questionnaire that writes `checklist.md`, `model_card.md`, `risk_file.md`. |
| `frai docs list` / `clean` / `export` | List, delete, or export the generated docs to PDF. |
| `frai setup [--key <key>] [--global]` | Store an OpenAI API key (optional, see below). |
| `frai config` | Show where an API key is configured. |
| `frai update` | Check npm for a newer `frai` release. |

### `frai scan`

Pattern matching, not semantic analysis. It uses regexes to find imports of known ML libraries (for example `tensorflow`, `torch`, `sklearn`, `transformers`) and calls to common function names (for example `fit`, `predict`, `generate`) in `.py`, `.ipynb`, `.js`, `.ts`, `.jsx`, `.tsx`, `.r`, `.java`, and `.scala` files. The library list does not yet include LLM API SDKs such as `openai`. Generic names like `fit` or `transform` can match non-AI code. Use it as a quick inventory, not as proof. `--json` prints raw results.

### `frai generate`

Run `frai generate`. It asks about your AI feature and writes three markdown files to the current directory: `checklist.md`, `model_card.md`, and `risk_file.md`.

- `--scan` runs `frai scan` first.
- `--export-pdf` exports the docs to PDF with `markdown-pdf` (fetched through `npx`). `frai docs export` does the same later.
- No API key is needed. If an OpenAI key is set with `frai setup` or `OPENAI_API_KEY`, FRAI adds AI-written tips to the docs. Without one, the tips are skipped.

---

## Try it without installing

- **Web scanner:** [frai.cc](https://frai.cc). Paste a URL and get a disclosure snapshot of that site.
- **Done-for-you audit:** [The AI Disclosure Teardown](https://frai.cc/teardown).

---

## Packages

| Package | Version | What it is |
|---------|---------|------------|
| [`frai`](https://www.npmjs.com/package/frai) | 1.2.0 | The CLI. |
| [`frai-gate`](https://www.npmjs.com/package/frai-gate) | 0.0.1 | The gate. Runs as `npx frai-gate`, or import `validateSpec` from it. |
| [`frai-core`](https://www.npmjs.com/package/frai-core) | 0.0.3 | The SDK behind the CLI: `Questionnaire`, `Documents`, `Scanners`, `Config`, `Providers`. |
| `frai-agent` | not published | LangChain experiment in this monorepo. Not supported. |

Using the gate from code:

```ts
import fs from 'node:fs/promises';
import { validateSpec } from 'frai-gate';

const result = validateSpec(await fs.readFile('FRAI-SPEC.md', 'utf8'));
```

## Ecosystem

| Project | Status | What it is |
|---------|--------|------------|
| [frai-skills](https://github.com/sebuzdugan/frai-skills) | Active | Agent skill for the FRAI Gate spec workflow. |
| [frai-benchmark](https://github.com/sebuzdugan/frai-benchmark) | Frozen, maintained as reference | Safety and compliance benchmark with a [leaderboard](https://sebuzdugan.github.io/frai-benchmark/). |
| [frai-chat](https://github.com/sebuzdugan/frai-chat) | Frozen, maintained as reference | Browser-based responsible-AI assistant. [Demo](https://sebuzdugan.github.io/frai-chat/). |

---

## Local development

```bash
pnpm install
pnpm --filter frai-gate build
pnpm --filter frai build
node packages/frai-cli/dist/index.js --help
```

## Publishing (maintainers)

1. Bump versions in `packages/frai-gate`, `packages/frai-core`, and `packages/frai-cli`.
2. Set dependency ranges to the versions you are about to publish, for example `"frai-gate": "^0.0.1"` and `"frai-core": "^0.0.2"`. Never publish with `workspace:*`.
3. Build:
   ```bash
   pnpm --filter frai-gate build
   pnpm --filter frai-core build
   pnpm --filter frai build
   ```
4. Publish in dependency order: `frai-gate`, then `frai-core`, then `frai`.
   ```bash
   cd packages/frai-gate && npm publish
   cd ../frai-core && npm publish
   cd ../frai-cli && npm publish
   ```
5. Verify with `npm view frai version`, `npm view frai-core version`, `npm view frai-gate version`.

---

## Experimental (not recommended yet)

These commands exist but are not ready for real use.

- `frai rag index`: builds a JSON index whose "embeddings" are 8-number character-code checksums. Not semantic search.
- `frai eval`: its toxicity metric is a six-word wordlist.
- `frai finetune template` / `validate`: lints a fine-tuning governance plan JSON. It trains nothing.

MIT licensed. Website: [frai.cc](https://frai.cc).

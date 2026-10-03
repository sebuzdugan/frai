# frai

![npm version](https://img.shields.io/npm/v/frai)

**Does your product tell people it uses AI?** One command checks your code, your live site and your spec, and tells you the one thing to fix.

```bash
npx frai
```

No key, no signup, no flags. Node 18 or newer.

![A real run of npx frai on frai.cc's own code](https://raw.githubusercontent.com/sebuzdugan/frai/main/assets/demo.gif)

```
FRAI review: support-app

Code   AI found  3 files using openai
Site   https://support.example.com/  needs a notice
       Chat tool found. No AI disclosure found. · found: Intercom
Spec   FRAI-SPEC.md  BLOCK
       Human oversight · Escalation path needs your answer: …
Next   answer the 4 open fields in FRAI-SPEC.md, then: npx frai gate check FRAI-SPEC.md
```

## Commands

| Command | What it does |
|---|---|
| `frai` | Review this project: code, live site, spec, next step. |
| `frai check <site>` | Check any site, no repo needed. `--email you@company.com` sends the full page-by-page report; add `--watch` to re-check it monthly. |
| `frai init` | Add `FRAI-SPEC.md` and the GitHub Action that runs the gate on every pull request. |
| `frai draft` | Fill the spec from your code, then write it into `FRAI-SPEC.md`. |
| `frai gate check FRAI-SPEC.md` | Run the gate. Exits 1 on BLOCK. |

Flags on `frai`: `--ci` (exit 1 when something needs fixing), `--json`, `--offline` (skip the site check), `--url <site>` (override the detected site).

## What it does for you

- **Finds your site.** From `homepage` in `package.json`, then `NEXT_PUBLIC_SITE_URL`, `SITE_URL` or `APP_URL` in `.env*`, then the first real link in your README.
- **Finds your AI.** Model calls in your code, and AI SDKs in `package.json`, `requirements.txt`, `pyproject.toml` or `Pipfile`. It skips hidden folders, `node_modules` and build output.
- **Finds your notice in code.** It looks through components, pages, templates and locale files for wording that tells people they are talking to AI, and names the file and line. Tests, docs and the spec do not count.
- **Notices when the spec is out of date.** If your code starts using a provider the spec never mentions — Anthropic next to OpenAI, say — `frai --ci` fails, even though the gate on its own would still pass.
- **Checks the live site** through [frai.cc](https://frai.cc): your homepage and policy pages, with the homepage loaded in a real browser so JavaScript chat widgets are found. It respects robots.txt ([how it reads sites](https://frai.cc/bot)).
- **Drafts honestly.** `frai draft` uses your local Claude (Claude Code login or `ANTHROPIC_API_KEY`), so nothing leaves your machine. Without one, frai.cc drafts it after listing the files it would send and asking. Anything your code doesn't show becomes `NEEDS HUMAN INPUT: <question>`, and the gate blocks until a person answers.

## In CI

```yaml
- run: npx frai@latest --ci --offline
```

Fails when the gate blocks, when AI code has no spec, or when the spec no longer names an AI provider the code uses. `frai init` writes a workflow that runs `npx frai@latest --ci --offline`; drop `--offline` (and add `--url`) to also fail when the live site has no notice. If frai.cc can't be reached, the site check is skipped rather than failing your build.

## Older tools

`frai scan` lists AI libraries and calls in your code. `frai generate` asks about your AI feature and writes `checklist.md`, `model_card.md` and `risk_file.md` (an OpenAI key adds AI-written tips). `frai rag`, `frai eval` and `frai finetune` are experiments.

MIT · [frai.cc](https://frai.cc) · [source](https://github.com/sebuzdugan/frai)

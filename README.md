# FRAI

![npm version](https://img.shields.io/npm/v/frai)
![npm downloads](https://img.shields.io/npm/dt/frai)

**Does your product tell people it uses AI?** FRAI checks your code, your live site and your spec, and blocks the release until the answer is yes.

The rule behind it is EU AI Act Article 50, enforceable since 2 August 2026: people must be told when they talk to an AI system or see AI-generated content. Fines reach €15M or 3% of global turnover.

![frai.cc, the free site check](assets/frai_cc_screenshot.png)

## Start here

```bash
npx frai
```

No key, no signup, no flags. In any repo it scans your code and dependencies for AI, finds your public site on its own, checks whether that site tells people, runs the gate if you have a spec, and prints the one thing to do next.

```
FRAI review: support-app

Code   AI found  3 files using openai
Site   https://support.example.com/  needs a notice
       Chat tool found. No AI disclosure found. · found: Intercom
Spec   FRAI-SPEC.md  BLOCK
       Human oversight · Escalation path needs your answer: …
Next   answer the 4 open fields in FRAI-SPEC.md, then: npx frai gate check FRAI-SPEC.md
```

## Four commands

| Command | What it does |
|---|---|
| `npx frai` | Review this project. `--ci` exits 1 when something needs fixing. `--json` for machines. |
| `npx frai check example.com` | Check any site. No repo, no key. Add `--email you@company.com` for the full report. |
| `npx frai init` | Add `FRAI-SPEC.md` and a GitHub Action that runs the gate on every pull request. |
| `npx frai draft` | Fill the spec from your own code. Uses your local Claude if you have one; otherwise frai.cc drafts it, after listing the files it would send. |

Where your code doesn't show an answer, the drafter writes `NEEDS HUMAN INPUT: <the question>` instead of guessing, and the gate blocks until a person answers it.

## Three depths of site check

| | Free check | Full report | Signed in |
|---|---|---|---|
| **Pages read** | Homepage + up to 3 policy pages | Up to 10, adding help, support, contact, FAQ | Same as the full report |
| **You get** | Verdict, what we found, the wording we found | Page by page, plus what to write and where | Every site you own, with history and one-click re-check |
| **How** | [frai.cc](https://frai.cc) or `npx frai check` | Your email on frai.cc, or `--email` | A free account on frai.cc |
| **Keeps running** | No | Optional monthly re-check | Re-check any time |

All three give the same verdict for the same site: **needs a notice**, **notice found**, or **no AI found**. The deeper checks read more of the places where chat assistants and their notices actually sit.

## Put it in CI

```bash
npx frai init
```

This writes `FRAI-SPEC.md` and `.github/workflows/rai-gate.yml`. The build fails until the spec answers seven questions: risk tier, data and privacy, human oversight, evaluation, bias, monitoring, and transparency (where the AI notice goes). Each answer needs a number, a name, or a mechanism.

`PASS` and `WARN` exit 0, `BLOCK` exits 1. The gate is deterministic: no key, no model. Add `--smart` for an AI review of vague answers (needs a Claude login or `ANTHROPIC_API_KEY`).

<img src="assets/frai-gate-demo.gif" width="360" alt="The gate blocks empty answers, the agent drafts them from the code, then it passes" />

Building with AI coding agents? `npx skills add sebuzdugan/frai-skills` teaches them to write specs that include the gate.

## How FRAI reads your site

FRAIBot reads robots.txt first and stays off anything it disallows. It fetches one page at a time, at least a second apart, identifies itself as `FRAIBot/1.0 (+https://frai.cc/bot)`, and never signs in or submits forms. Your homepage is also loaded once in a real browser, so chat widgets added by JavaScript are seen the way a visitor sees them. Details and how to block it: [frai.cc/bot](https://frai.cc/bot).

FRAI is a technical check, not legal advice.

## Packages

| Package | What it is |
|---|---|
| [`frai`](https://www.npmjs.com/package/frai) | The CLI. Node 18+. |
| [`frai-gate`](https://www.npmjs.com/package/frai-gate) | The gate on its own: `npx frai-gate check FRAI-SPEC.md`, or `import { validateSpec } from 'frai-gate'`. |
| [`frai-core`](https://www.npmjs.com/package/frai-core) | The SDK under the CLI: `Scanners`, `Documents`, `Questionnaire`, `Config`, `Providers`. |

The CLI also keeps its original tools: `frai scan` (AI libraries and calls in your code) and `frai generate` (a questionnaire that writes a checklist, model card and risk file). `frai rag`, `frai eval` and `frai finetune` are experiments and not ready for real use.

## Develop

```bash
pnpm install
pnpm --filter frai-gate build && pnpm --filter frai build
node packages/frai-cli/dist/index.js --help
```

To release, bump the three packages, point `frai`'s dependency ranges at the versions you're publishing (never `workspace:*`), build, then publish `frai-gate`, `frai-core` and `frai` in that order.

MIT licensed · [frai.cc](https://frai.cc)

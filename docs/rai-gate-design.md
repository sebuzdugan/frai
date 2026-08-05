# Responsible AI Gate — Design

*Date: 2026-08-05 · Status: implemented*

## What this adds

Inspired by [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) — a collection of
engineering skills that force AI coding agents through quality gates (spec → plan → build → verify) —
FRAI gains the **responsible-AI equivalent of that gate**, without replicating the generic lifecycle
skills. One gate, done deeply:

> **No AI feature spec is complete without a Responsible AI Gate section, and nothing ships
> until the gate passes.**

Three pieces:

| Piece | Path | What it is |
|---|---|---|
| Skill | [sebuzdugan/frai-skills](https://github.com/sebuzdugan/frai-skills) (moved out of this repo 2026-08-05) | An agent skill (agent-skills `SKILL.md` format, installable via `npx skills add sebuzdugan/frai`) that makes any coding agent write specs that include the RAI Gate |
| Spec template | `packages/frai-gate/assets/rai-spec-template.md` (canonical copy also in frai-skills) | Copy-paste spec template with the `## Responsible AI Gate` section built in |
| Pipeline | `packages/frai-gate/` | `frai-gate` — a Claude Agent SDK pipeline + deterministic validator that drafts, checks, and enforces the gate (CI-friendly) |

## The gate: seven checks

Aligned with frai-core's questionnaire dimensions (core / impact / data / performance / monitoring / bias)
plus the EU AI Act tiering already used by FRAI Chat:

1. **Risk tier** — EU AI Act-aligned classification (prohibited / high / limited / minimal) with justification. High-risk requires a named human sign-off.
2. **Data provenance & privacy** — sources, PII handling, consent basis, retention.
3. **Human oversight** — automation level, override path, kill switch.
4. **Evaluation plan** — pre-ship metrics with numeric thresholds.
5. **Bias & fairness** — affected groups, mitigations, how tested.
6. **Monitoring & rollback** — production monitoring, degradation detection, rollback trigger.
7. **Transparency & incident response** — user disclosure of AI, incident owner and process.

Verdicts: **PASS** (all checks complete) / **WARN** (complete but weak answers) / **BLOCK**
(missing sections, placeholders, or high-risk without sign-off). BLOCK exits non-zero for CI.

## frai-gate pipeline (Claude Agent SDK)

Two layers so it is useful with or without an API key:

- **Deterministic layer (no key needed):** parses the spec markdown, verifies every gate
  subsection exists and is answered (no `TBD`/placeholder text), enforces the high-risk
  sign-off rule. Powers `frai-gate check` and CI.
- **Smart layer (Claude Agent SDK):** `query()` from `@anthropic-ai/claude-agent-sdk` with
  read-only tools (`Read`, `Glob`, `Grep`) scoped to the repo:
  - `frai-gate draft` — scans the codebase for AI indicators, then drafts a filled-in
    RAI Gate section grounded in what the code actually does.
  - `frai-gate check --smart` — after the deterministic pass, adversarially reviews each
    gate answer for quality (vague thresholds, untestable claims) and adds findings.

Commands: `frai-gate init` (drop the template into the repo) · `frai-gate check <spec>` ·
`frai-gate draft [--out <file>]` · all support `--json`.

## Decisions

- **TypeScript package mirroring `frai-agent`** (tsc build, `dist/`, ESM) — matches monorepo conventions.
- **Claude Agent SDK, not LangChain** — the user asked for an Agent SDK pipeline; `frai-agent`
  (LangChain/OpenAI) stays untouched. The SDK's built-in Read/Glob/Grep tools replace custom scan
  plumbing, with `permissionMode` restricted and write tools disallowed.
- **Skill lives in `skills/`** at repo root so the standard `npx skills add` layout finds it, and
  a `/rai-spec` slash command is provided under `.claude/commands/` for Claude Code users.
- **Only one skill** — deliberately no spec/plan/build/test clones; agent-skills already covers those.

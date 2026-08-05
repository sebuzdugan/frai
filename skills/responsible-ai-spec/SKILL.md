---
name: responsible-ai-spec
description: Enforces a Responsible AI Gate in every spec that touches AI. Use when writing a spec, PRD, or design doc for any feature that calls a model, trains one, processes user data with AI, or ships AI-generated output to users. Also use when reviewing an existing spec for responsible-AI completeness.
---

# Responsible AI Spec Gate

## Overview

A spec that ships an AI feature without answering the responsible-AI questions is a
compliance incident on a delay. Risk tier, data provenance, oversight, evaluation,
bias, monitoring, and transparency are cheapest to answer **before code exists** —
and impossible to retrofit honestly after launch.

This skill adds one hard gate to spec-writing: **every spec for an AI-touching
feature must contain a complete `## Responsible AI Gate` section, and implementation
does not start until the gate passes.**

It does not replace your spec workflow (spec-driven development, planning, TDD —
use whatever you use). It bolts one section and one checkpoint onto it.

## When to Use

Use this skill when the feature being specified does ANY of:

- Calls an LLM or any ML model (API or self-hosted)
- Trains, fine-tunes, or evaluates a model
- Processes user data with AI (classification, scoring, recommendation, moderation)
- Shows AI-generated content to users
- Automates a decision that affects a person (pricing, ranking, access, hiring, credit)

Skip it only when the change provably touches no AI path (a CSS fix, a docs typo).
"It's just a small prompt change" does not qualify for skipping — prompt changes
alter model behavior and re-open the evaluation and monitoring answers.

## The Gated Workflow

```
Classify → Specify (with Gate) → Check → Implement
```

1. **Classify** — determine the risk tier first (see `references/eu-ai-act-tiers.md`).
   The tier decides how much rigor the rest of the gate needs.
2. **Specify** — write the spec using `templates/rai-spec-template.md`, or add the
   `## Responsible AI Gate` section from that template to your existing spec format.
   Answer all seven checks concretely. No `TBD`. No "we'll figure it out later."
3. **Check** — validate the gate before implementation:
   - Automated: `npx frai-gate check <spec.md>` (deterministic; add `--smart` for an
     AI quality review). BLOCK = do not proceed.
   - Manual: walk `references/rai-gate-checklist.md` line by line.
   - **High-risk tier requires a named human sign-off in the spec.** An agent cannot
     self-approve a high-risk gate. Stop and ask the human.
4. **Implement** — only after the gate passes. If scope changes mid-build in a way
   that touches any gate answer (new data source, more automation, new user surface),
   the gate re-opens: update the section and re-check before continuing.

## The Seven Gate Checks

| # | Check | Must answer |
|---|-------|-------------|
| 1 | **Risk tier** | EU AI Act-aligned tier (prohibited / high / limited / minimal) + one-paragraph justification. High → named sign-off required. |
| 2 | **Data provenance & privacy** | Data sources, whether PII is involved, lawful/consent basis, retention period and deletion path. |
| 3 | **Human oversight** | Automation level (assistive / human-in-the-loop / autonomous), who can override, how to shut it off. |
| 4 | **Evaluation plan** | Metrics with numeric thresholds that must pass BEFORE shipping, and the dataset they run on. |
| 5 | **Bias & fairness** | Which user groups could be disparately affected, mitigations, and how you will test for it. |
| 6 | **Monitoring & rollback** | What is monitored in production, what counts as degradation, and the concrete rollback trigger + procedure. |
| 7 | **Transparency & incident response** | How users know they are interacting with AI / seeing AI output, who owns incidents, and the response path. |

Each check must be answered with **specifics that could be proven wrong** — a
threshold, a named owner, a retention number. "We take privacy seriously" fails
the gate; "prompts are retained 30 days then hard-deleted; no training on user
data" passes.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "This is an internal tool, no gate needed" | Internal tools leak, get productized, and process employee data. The gate takes 20 minutes; run it. Internal-only status usually just lowers the tier — it doesn't skip the gate. |
| "We can fill in the RAI section after we build it" | Post-hoc answers describe what you built, not what you decided. That's documentation theater, and it's exactly what reviewers and regulators discount. |
| "The model provider already handles safety" | The provider handles *their* model's safety. Your use case, your data, your users, your automated decisions — those are yours, and the gate covers those. |
| "It's low risk, obviously" | Then classifying it takes two minutes and check #1 is done. "Obviously" without the written justification is how high-risk features ship as minimal-risk. |
| "The eval can just be vibes / manual QA" | An eval without a numeric threshold cannot fail, and a check that cannot fail is not a check. Pick a metric and a number, even a modest one. |
| "Adding sign-off will slow us down" | Only high-risk features need sign-off. If the feature is genuinely high-risk, a day of review is cheaper than an incident, a recall, or a fine. |

## Red Flags — stop and re-open the gate

- A gate answer contains `TBD`, `TODO`, `N/A` (without justification), or restates the question
- The risk tier says minimal but the feature automates a decision about a person
- The eval plan has metrics but no thresholds, or thresholds but no dataset
- The spec gained a new data source or user surface since the gate was checked
- You are about to write code and cannot say who signs off the high-risk gate
- The rollback plan is "turn it off" with no owner, trigger, or user-impact note

## Verification (exit criteria)

Before marking the spec ready for implementation, confirm:

- [ ] Spec contains a `## Responsible AI Gate` section with all seven checks
- [ ] Every check answered with falsifiable specifics (numbers, names, datasets)
- [ ] Risk tier justified in writing; high-risk has a named human sign-off
- [ ] `npx frai-gate check <spec.md>` returns PASS (or the manual checklist is clean)
- [ ] Gate answers are consistent with the rest of the spec (no contradiction with
  the architecture or data-flow sections)

## Files

- `templates/rai-spec-template.md` — full spec template with the gate built in
- `references/eu-ai-act-tiers.md` — risk-tier classification reference
- `references/rai-gate-checklist.md` — line-by-line manual checklist (mirrors the automated validator)
- Automated enforcement: [`frai-gate`](https://github.com/sebuzdugan/frai) (`npx frai-gate check`, `npx frai-gate draft`)

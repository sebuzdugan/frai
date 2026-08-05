# frai-gate

The **FRAI Gate** (Responsible AI Gate) for specs - part of [FRAI](https://github.com/sebuzdugan/frai).

Every spec for an AI-touching feature must contain a complete `## FRAI Gate`
section - seven checks - and implementation doesn't start until the gate passes:

1. Risk tier (EU AI Act-aligned; high-risk requires a named human sign-off)
2. Data provenance & privacy
3. Human oversight
4. Evaluation plan (numeric thresholds)
5. Bias & fairness
6. Monitoring & rollback
7. Transparency & incident response

## Usage

```bash
npx frai-gate init --ci                 # scaffold FRAI-SPEC.md + a GitHub Action that runs
                                        # the gate on every PR (works in any repo)
npx frai-gate check FRAI-SPEC.md         # deterministic validation - no API key needed
npx frai-gate check FRAI-SPEC.md --smart # + adversarial AI review of answer quality
npx frai-gate draft                     # read-only agent scans the repo and drafts a
                                        # gate section grounded in your actual code
```

Also available as `frai gate ...` from the main [frai CLI](https://www.npmjs.com/package/frai).

Exit codes: `0` PASS/WARN · `1` BLOCK · `2` usage/error - drop `frai-gate check` straight into CI.

`draft` and `--smart` run on the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk)
with read-only tools (`Read`, `Glob`, `Grep`) and need Claude Code authentication or
`ANTHROPIC_API_KEY`. Override the model with `FRAI_GATE_MODEL` (default `claude-opus-5`).

> **Privacy note:** `draft` and `--smart` send the repository content the agent reads to
> Anthropic's API. The agent is instructed never to read secret material (`.env`, keys,
> certificates, credential stores), but treat that as a mitigation, not a guarantee -
> think before running them on highly sensitive repos. `check` without `--smart` makes
> no network calls at all.

## Programmatic API

```ts
import { validateSpec, draftGateSection, smartReview } from 'frai-gate';

const result = validateSpec(await fs.readFile('FRAI-SPEC.md', 'utf8'));
// { verdict: 'PASS' | 'WARN' | 'BLOCK', tier, findings, gateSection }
```

The companion agent skill lives in
[sebuzdugan/frai-skills](https://github.com/sebuzdugan/frai-skills)
(`npx skills add sebuzdugan/frai-skills`).

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSpec } from './validate.js';

const here = path.dirname(fileURLToPath(import.meta.url));

function fullSpec(overrides: Partial<Record<string, string>> = {}): string {
  const sections: Record<string, string> = {
    tier: `### 5.1 Risk tier

- **Tier**: limited
- **Justification**: Chatbot answering policy questions; no automated decisions about people.
- **Sign-off**: not required (tier below high)`,
    data: `### 5.2 Data provenance & privacy

- **Data sources**: internal policy docs; user questions at runtime
- **PII involved?**: no
- **Retention**: prompts kept 30 days, then hard-deleted
- **Used for training?**: no; provider training disabled`,
    oversight: `### 5.3 Human oversight

- **Automation level**: assistive
- **Override path**: support team can correct answers via admin panel
- **Kill switch**: feature flag chat_enabled, ops on-call, off within 5 minutes`,
    evaluation: `### 5.4 Evaluation plan

- **Pre-ship metrics & thresholds**: groundedness >= 0.85; refusal rate <= 2%
- **Eval dataset**: eval/policy-qa.jsonl, 300 questions from real support tickets
- **Who runs it and when**: CI on every prompt change`,
    bias: `### 5.5 Bias & fairness

- **Groups at risk of disparate impact**: non-native English speakers
- **Mitigations**: multilingual eval slice; simplified-language prompt rule
- **How tested**: disaggregated groundedness by question language`,
    monitoring: `### 5.6 Monitoring & rollback

- **Production monitoring**: thumbs-down rate, refusal rate, latency
- **Degradation definition**: thumbs-down > 10% over 24h
- **Rollback trigger & procedure**: on-call flips chat_enabled off; users see the legacy FAQ`,
    transparency: `### 5.7 Transparency & incident response

- **User disclosure**: "AI assistant" label in the chat header
- **Incident owner**: Dana Rivers (support-eng rotation)
- **Incident path**: in-chat report -> triage queue -> fix or disable, response within 24h`
  };
  Object.assign(sections, overrides);
  return `# Spec: Policy Chatbot

## 1. Objective

Answer policy questions.

## 5. Responsible AI Gate

${Object.values(sections).join('\n\n')}

## 6. Rollout

Later.`;
}

describe('validateSpec', () => {
  it('blocks a spec with no gate section', () => {
    const result = validateSpec('# Spec\n\n## Objective\n\nBuild a thing.');
    expect(result.verdict).toBe('BLOCK');
    expect(result.findings[0].checkId).toBe('structure');
  });

  it('passes a fully answered gate', () => {
    const result = validateSpec(fullSpec());
    expect(result.findings).toEqual([]);
    expect(result.verdict).toBe('PASS');
    expect(result.tier).toBe('limited');
  });

  it('blocks the untouched template (empty fields)', () => {
    const template = fs.readFileSync(
      path.join(here, '../../assets/rai-spec-template.md'),
      'utf8'
    );
    const result = validateSpec(template);
    expect(result.verdict).toBe('BLOCK');
    expect(result.findings.some((f) => f.message.includes('Unanswered field'))).toBe(true);
  });

  it('blocks placeholder answers', () => {
    const result = validateSpec(
      fullSpec({
        data: `### 5.2 Data provenance & privacy

- **Data sources**: TBD
- **PII involved?**: no
- **Retention**: 30 days
- **Used for training?**: no`
      })
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.findings.some((f) => f.checkId === 'data-privacy')).toBe(true);
  });

  it('blocks a missing subsection', () => {
    const spec = fullSpec();
    const withoutBias = spec.replace(/### 5\.5 Bias & fairness[\s\S]*?(?=### 5\.6)/, '');
    const result = validateSpec(withoutBias);
    expect(result.verdict).toBe('BLOCK');
    expect(result.findings.some((f) => f.checkId === 'bias' && f.message.includes('Missing'))).toBe(
      true
    );
  });

  it('blocks high risk without sign-off', () => {
    const result = validateSpec(
      fullSpec({
        tier: `### 5.1 Risk tier

- **Tier**: high
- **Justification**: Screens job applications automatically.
- **Sign-off**: not required (tier below high)`
      })
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.findings.some((f) => f.message.includes('sign-off'))).toBe(true);
  });

  it('accepts high risk with a named sign-off', () => {
    const result = validateSpec(
      fullSpec({
        tier: `### 5.1 Risk tier

- **Tier**: high
- **Justification**: Screens job applications automatically.
- **Sign-off**: Ana Pop (Head of Compliance), 2026-08-01`
      })
    );
    expect(result.findings.filter((f) => f.checkId === 'risk-tier')).toEqual([]);
  });

  it('blocks a prohibited tier', () => {
    const result = validateSpec(
      fullSpec({
        tier: `### 5.1 Risk tier

- **Tier**: prohibited
- **Justification**: Social scoring.
- **Sign-off**: n/a`
      })
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.findings.some((f) => f.message.includes('must not be built'))).toBe(true);
  });

  it('blocks an unrecognized tier value', () => {
    const result = validateSpec(
      fullSpec({
        tier: `### 5.1 Risk tier

- **Tier**: medium-ish
- **Justification**: Feels fine.
- **Sign-off**: not required (tier below high)`
      })
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.tier).toBeNull();
  });

  it('accepts the branded "## FRAI Gate" heading', () => {
    const spec = fullSpec().replace('## 5. Responsible AI Gate', '## FRAI Gate');
    const result = validateSpec(spec);
    expect(result.verdict).toBe('PASS');
    expect(result.tier).toBe('limited');
  });

  it('warns when the evaluation plan has no numbers', () => {
    const result = validateSpec(
      fullSpec({
        evaluation: `### 5.4 Evaluation plan

- **Pre-ship metrics & thresholds**: we will check answers look good
- **Eval dataset**: some real questions
- **Who runs it and when**: the team, before release`
      })
    );
    expect(result.verdict).toBe('WARN');
    expect(
      result.findings.some((f) => f.checkId === 'evaluation' && f.severity === 'warn')
    ).toBe(true);
  });
});

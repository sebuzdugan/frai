export type Severity = 'block' | 'warn';

export interface GateCheck {
  id: string;
  title: string;
  /** Matches the subsection heading inside the Responsible AI Gate section. */
  headingPattern: RegExp;
  /** When true, a body without any digit produces a warning (thresholds expected). */
  expectsNumbers?: boolean;
}

/** Matches both the branded "FRAI Gate" heading and the long-form "Responsible AI Gate". */
export const GATE_HEADING = /(responsible\s+ai|frai)\s+gate/i;

export const RISK_TIERS = ['prohibited', 'high', 'limited', 'minimal'] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

export const GATE_CHECKS: GateCheck[] = [
  { id: 'risk-tier', title: 'Risk tier', headingPattern: /risk|tier/i },
  {
    id: 'data-privacy',
    title: 'Data & privacy',
    headingPattern: /data|privacy|provenance/i
  },
  { id: 'oversight', title: 'Human oversight', headingPattern: /oversight|human|control/i },
  {
    id: 'evaluation',
    title: 'Evaluation plan',
    headingPattern: /eval/i,
    expectsNumbers: true
  },
  { id: 'bias', title: 'Bias & fairness', headingPattern: /bias|fairness/i },
  {
    id: 'monitoring',
    title: 'Monitoring & rollback',
    headingPattern: /monitor|rollback/i,
    expectsNumbers: true
  },
  {
    id: 'transparency',
    title: 'Transparency & incidents',
    headingPattern: /transparen|incident|disclosure/i
  }
];

export interface Finding {
  checkId: string;
  severity: Severity;
  message: string;
  /** 'validator' for deterministic findings, 'agent' for smart-review findings. */
  source: 'validator' | 'agent';
}

export type Verdict = 'PASS' | 'WARN' | 'BLOCK';

export interface GateResult {
  verdict: Verdict;
  tier: RiskTier | null;
  findings: Finding[];
  /** Raw text of the gate section, when found. */
  gateSection: string | null;
}

export function verdictFrom(findings: Finding[]): Verdict {
  if (findings.some((f) => f.severity === 'block')) return 'BLOCK';
  if (findings.some((f) => f.severity === 'warn')) return 'WARN';
  return 'PASS';
}

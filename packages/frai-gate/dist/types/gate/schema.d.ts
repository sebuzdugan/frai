export type Severity = 'block' | 'warn';
export interface GateCheck {
    id: string;
    title: string;
    /** Matches the subsection heading inside the Responsible AI Gate section. */
    headingPattern: RegExp;
    /** When true, a body without any digit produces a warning (thresholds expected). */
    expectsNumbers?: boolean;
}
export declare const GATE_HEADING: RegExp;
export declare const RISK_TIERS: readonly ["prohibited", "high", "limited", "minimal"];
export type RiskTier = (typeof RISK_TIERS)[number];
export declare const GATE_CHECKS: GateCheck[];
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
export declare function verdictFrom(findings: Finding[]): Verdict;

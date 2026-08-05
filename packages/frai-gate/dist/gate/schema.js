/** Matches both the branded "FRAI Gate" heading and the long-form "Responsible AI Gate". */
export const GATE_HEADING = /(responsible\s+ai|frai)\s+gate/i;
export const RISK_TIERS = ['prohibited', 'high', 'limited', 'minimal'];
export const GATE_CHECKS = [
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
export function verdictFrom(findings) {
    if (findings.some((f) => f.severity === 'block'))
        return 'BLOCK';
    if (findings.some((f) => f.severity === 'warn'))
        return 'WARN';
    return 'PASS';
}

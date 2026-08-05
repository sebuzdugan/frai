export const GATE_HEADING = /responsible\s+ai\s+gate/i;
export const RISK_TIERS = ['prohibited', 'high', 'limited', 'minimal'];
export const GATE_CHECKS = [
    { id: 'risk-tier', title: 'Risk tier', headingPattern: /risk\s+tier/i },
    {
        id: 'data-privacy',
        title: 'Data provenance & privacy',
        headingPattern: /data\s+(provenance|privacy|sources)/i
    },
    { id: 'oversight', title: 'Human oversight', headingPattern: /human\s+oversight|oversight/i },
    {
        id: 'evaluation',
        title: 'Evaluation plan',
        headingPattern: /evaluation|eval\s+plan/i,
        expectsNumbers: true
    },
    { id: 'bias', title: 'Bias & fairness', headingPattern: /bias|fairness/i },
    {
        id: 'monitoring',
        title: 'Monitoring & rollback',
        headingPattern: /monitoring|rollback/i,
        expectsNumbers: true
    },
    {
        id: 'transparency',
        title: 'Transparency & incident response',
        headingPattern: /transparency|incident/i
    }
];
export function verdictFrom(findings) {
    if (findings.some((f) => f.severity === 'block'))
        return 'BLOCK';
    if (findings.some((f) => f.severity === 'warn'))
        return 'WARN';
    return 'PASS';
}

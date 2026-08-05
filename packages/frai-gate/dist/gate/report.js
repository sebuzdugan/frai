const VERDICT_ICON = {
    PASS: '✅',
    WARN: '⚠️',
    BLOCK: '⛔'
};
function line(finding) {
    const icon = finding.severity === 'block' ? '⛔' : '⚠️';
    const tag = finding.source === 'agent' ? ' (smart review)' : '';
    return `${icon} [${finding.checkId}]${tag} ${finding.message}`;
}
export function renderText(result, specPath) {
    const out = [];
    out.push(`FRAI Gate - ${specPath}`);
    out.push(`Verdict: ${VERDICT_ICON[result.verdict]} ${result.verdict}`);
    if (result.tier)
        out.push(`Risk tier: ${result.tier}`);
    if (result.findings.length === 0) {
        out.push('All seven gate checks answered. Clear to implement.');
    }
    else {
        out.push('');
        for (const finding of result.findings)
            out.push(line(finding));
        out.push('');
        if (result.verdict === 'BLOCK') {
            out.push('BLOCK: fix the items above before implementation starts.');
        }
        else if (result.verdict === 'WARN') {
            out.push('WARN: the gate passes structurally, but tighten the flagged answers.');
        }
    }
    return out.join('\n');
}
export function renderJson(result, specPath) {
    return JSON.stringify({
        spec: specPath,
        verdict: result.verdict,
        tier: result.tier,
        findings: result.findings
    }, null, 2);
}

import { GATE_CHECKS, GATE_HEADING, RISK_TIERS, verdictFrom } from './schema.js';
const PLACEHOLDER = /\b(TBD|TODO|FIXME|XXX)\b|\bfill\s+(this\s+)?in\b/i;
/** A template field line whose value was never filled in, e.g. `- **Retention**:` */
const EMPTY_FIELD = /^\s*[-*]\s*\*\*[^*]+\*\*.*:\s*$/;
function stripComments(markdown) {
    return markdown.replace(/<!--[\s\S]*?-->/g, '');
}
/** Extracts the Responsible AI Gate section: from its heading to the next heading of the same or higher level. */
export function extractGateSection(markdown) {
    const lines = markdown.split(/\r?\n/);
    let start = -1;
    let level = 0;
    for (let i = 0; i < lines.length; i += 1) {
        const m = lines[i].match(/^(#{1,6})\s+(.*)$/);
        if (m && GATE_HEADING.test(m[2])) {
            start = i;
            level = m[1].length;
            break;
        }
    }
    if (start === -1)
        return null;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i += 1) {
        const m = lines[i].match(/^(#{1,6})\s+/);
        if (m && m[1].length <= level) {
            end = i;
            break;
        }
    }
    return lines.slice(start, end).join('\n');
}
/** Splits the gate section into subsections keyed by their headings (any level deeper than the gate heading). */
function splitSubsections(gateSection) {
    const lines = gateSection.split(/\r?\n/);
    const gateLevel = lines[0].match(/^(#{1,6})/)?.[1]?.length ?? 1;
    const sections = [];
    let current = null;
    for (const line of lines.slice(1)) {
        const m = line.match(/^(#{1,6})\s+(.*)$/);
        if (m && m[1].length > gateLevel) {
            if (current)
                sections.push(current);
            current = { heading: m[2].trim(), body: '' };
        }
        else if (current) {
            current.body += `${line}\n`;
        }
    }
    if (current)
        sections.push(current);
    return sections;
}
function extractTier(body) {
    // When an explicit "Tier" field line exists, it is authoritative - a fallback body
    // search would pick up incidental mentions like "(tier below high)" in the sign-off.
    const fieldLine = body
        .split(/\r?\n/)
        .find((l) => /\*\*tier\*\*/i.test(l) || /^\s*[-*]\s*tier\b/i.test(l));
    const haystacks = fieldLine ? [fieldLine] : [body];
    for (const text of haystacks) {
        // Skip the template's enum hint "(prohibited / high / limited / minimal)".
        const cleaned = text.replace(/\((?:[^)]*\/){2,}[^)]*\)/g, '');
        const found = RISK_TIERS.filter((t) => new RegExp(`\\b${t}\\b`, 'i').test(cleaned));
        if (found.length === 1)
            return found[0];
        if (found.length > 1) {
            // Ambiguous mention; prefer the value after a colon on the field line.
            const afterColon = cleaned.split(':').slice(1).join(':');
            const inValue = RISK_TIERS.filter((t) => new RegExp(`\\b${t}\\b`, 'i').test(afterColon));
            if (inValue.length === 1)
                return inValue[0];
        }
    }
    return null;
}
function answeredText(body) {
    return body
        .split(/\r?\n/)
        .filter((l) => !EMPTY_FIELD.test(l))
        .join('\n')
        .trim();
}
export function validateSpec(markdown) {
    const findings = [];
    const clean = stripComments(markdown);
    const gateSection = extractGateSection(clean);
    if (!gateSection) {
        findings.push({
            checkId: 'structure',
            severity: 'block',
            message: 'No "## Responsible AI Gate" section found in the spec.',
            source: 'validator'
        });
        return { verdict: 'BLOCK', tier: null, findings, gateSection: null };
    }
    const subsections = splitSubsections(gateSection);
    let tier = null;
    for (const check of GATE_CHECKS) {
        const section = subsections.find((s) => check.headingPattern.test(s.heading));
        if (!section) {
            findings.push({
                checkId: check.id,
                severity: 'block',
                message: `Missing gate subsection: "${check.title}".`,
                source: 'validator'
            });
            continue;
        }
        const body = section.body;
        const answered = answeredText(body);
        if (!answered) {
            findings.push({
                checkId: check.id,
                severity: 'block',
                message: `"${check.title}" is present but empty.`,
                source: 'validator'
            });
            continue;
        }
        if (PLACEHOLDER.test(body)) {
            findings.push({
                checkId: check.id,
                severity: 'block',
                message: `"${check.title}" contains placeholder text (TBD/TODO). Answer it concretely.`,
                source: 'validator'
            });
        }
        const emptyFields = body.split(/\r?\n/).filter((l) => EMPTY_FIELD.test(l));
        for (const line of emptyFields) {
            findings.push({
                checkId: check.id,
                severity: 'block',
                message: `Unanswered field in "${check.title}": ${line.trim()}`,
                source: 'validator'
            });
        }
        if (check.expectsNumbers && !/\d/.test(answered)) {
            findings.push({
                checkId: check.id,
                severity: 'warn',
                message: `"${check.title}" has no numeric threshold. A check that cannot fail is not a check.`,
                source: 'validator'
            });
        }
        if (check.id === 'risk-tier') {
            tier = extractTier(body);
            if (!tier) {
                findings.push({
                    checkId: check.id,
                    severity: 'block',
                    message: 'Risk tier must be one of: prohibited, high, limited, minimal.',
                    source: 'validator'
                });
            }
            else if (tier === 'prohibited') {
                findings.push({
                    checkId: check.id,
                    severity: 'block',
                    message: 'Risk tier is "prohibited" - this feature must not be built.',
                    source: 'validator'
                });
            }
            else if (tier === 'high') {
                const signoffLine = body
                    .split(/\r?\n/)
                    .find((l) => /sign[- ]?off/i.test(l) && !EMPTY_FIELD.test(l));
                const signoffValue = signoffLine ? signoffLine.split(':').slice(1).join(':').trim() : '';
                if (!signoffValue || /not\s+required/i.test(signoffValue)) {
                    findings.push({
                        checkId: check.id,
                        severity: 'block',
                        message: 'High-risk tier requires a named human sign-off (name + date) in the spec.',
                        source: 'validator'
                    });
                }
            }
        }
    }
    return { verdict: verdictFrom(findings), tier, findings, gateSection };
}

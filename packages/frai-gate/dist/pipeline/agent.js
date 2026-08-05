import { query } from '@anthropic-ai/claude-agent-sdk';
const DEFAULT_MODEL = process.env.FRAI_GATE_MODEL ?? 'claude-opus-5';
const SECRETS_GUARD = `Never read, quote, or summarize secret material: skip .env and .env.* files, private keys and certificates (id_*, *.pem, *.key, *.p12), credential stores, token caches, and anything under a secrets/ or credentials/ directory. If a gate answer would require their contents, write "NEEDS HUMAN INPUT" instead.`;
const READ_ONLY_OPTIONS = {
    allowedTools: ['Read', 'Glob', 'Grep'],
    disallowedTools: ['Write', 'Edit', 'NotebookEdit', 'Bash', 'WebFetch', 'WebSearch', 'Task'],
    permissionMode: 'bypassPermissions',
    model: DEFAULT_MODEL
};
async function runQuery(prompt, cwd, maxTurns) {
    const stream = query({
        prompt,
        options: { ...READ_ONLY_OPTIONS, cwd, maxTurns }
    });
    let resultText = '';
    for await (const message of stream) {
        const anyMessage = message;
        if (anyMessage.type === 'result') {
            if (anyMessage.subtype && anyMessage.subtype !== 'success') {
                throw new Error(`Agent run ended without success (${anyMessage.subtype}).`);
            }
            resultText = anyMessage.result ?? '';
        }
    }
    return resultText;
}
function between(text, begin, end) {
    const start = text.indexOf(begin);
    if (start === -1)
        return null;
    const stop = text.indexOf(end, start + begin.length);
    if (stop === -1)
        return null;
    return text.slice(start + begin.length, stop).trim();
}
/**
 * Scans the repository at `cwd` with a read-only Claude Agent SDK session and drafts
 * a filled-in "## Responsible AI Gate" section grounded in the actual code.
 */
export async function draftGateSection(cwd) {
    const prompt = `You are FRAI's Responsible AI Gate drafter. Explore this repository (read-only: Read, Glob, Grep) and identify how AI is used: model/API calls (OpenAI, Anthropic, HuggingFace, local models), training or fine-tuning code, prompts, user data flowing into models, and AI output shown to users.

${SECRETS_GUARD}

Then draft a completed "## Responsible AI Gate" spec section with these seven subsections:
### Risk tier            — tier (prohibited/high/limited/minimal) + justification + sign-off line
### Data provenance & privacy — sources, PII yes/no + basis, retention, trained-on-user-data
### Human oversight      — automation level, override path, kill switch
### Evaluation plan      — metrics with numeric thresholds, eval dataset, owner/when
### Bias & fairness      — groups at risk, mitigations, test method
### Monitoring & rollback — signals, numeric degradation definition, rollback trigger/procedure
### Transparency & incident response — user disclosure, incident owner, response path

Rules:
- Ground every answer in what you actually found in the code; cite file paths inline where useful.
- Where an answer requires a human/business decision you cannot infer (retention policy, sign-off, incident owner), write "NEEDS HUMAN INPUT: <specific question>" instead of inventing a value.
- Propose concrete numeric thresholds as suggestions where the code implies them (mark them "suggested").
- If the repo contains no AI usage at all, say so plainly instead of drafting a gate.

Output ONLY the drafted markdown between these exact markers:
<!-- RAI-GATE:BEGIN -->
## Responsible AI Gate
...subsections...
<!-- RAI-GATE:END -->`;
    const result = await runQuery(prompt, cwd, 50);
    const section = between(result, '<!-- RAI-GATE:BEGIN -->', '<!-- RAI-GATE:END -->');
    if (section)
        return section;
    if (/## Responsible AI Gate/i.test(result))
        return result.trim();
    throw new Error(`Agent did not return a gate section. Raw output:\n${result}`);
}
/**
 * Adversarially reviews an already-valid gate section for quality: vague answers,
 * untestable claims, thresholds that don't match the code. Returns extra findings.
 */
export async function smartReview(specMarkdown, cwd) {
    const prompt = `You are FRAI's Responsible AI Gate reviewer. Below is a spec containing a "## Responsible AI Gate" section. Adversarially review ONLY the gate answers for quality. You may Read/Glob/Grep this repository to verify claims against the code.

${SECRETS_GUARD}

Flag (severity "warn" unless truly disqualifying, then "block"):
- Vague or unfalsifiable answers ("we take privacy seriously", "monitor closely")
- Metrics without thresholds, thresholds without datasets, owners that are teams instead of people
- Gate answers contradicted by the code (e.g. spec says "no PII" but code logs emails)
- A risk tier that is too low for what the feature actually does

Do NOT flag style, formatting, or sections outside the gate. If everything is solid, return an empty list.

Output ONLY JSON between these exact markers (checkId one of: risk-tier, data-privacy, oversight, evaluation, bias, monitoring, transparency):
<!-- RAI-FINDINGS:BEGIN -->
[{"checkId": "...", "severity": "warn", "message": "..."}]
<!-- RAI-FINDINGS:END -->

SPEC:
${specMarkdown}`;
    const result = await runQuery(prompt, cwd, 30);
    const json = between(result, '<!-- RAI-FINDINGS:BEGIN -->', '<!-- RAI-FINDINGS:END -->');
    if (json === null)
        throw new Error(`Reviewer did not return findings JSON. Raw output:\n${result}`);
    const parsed = JSON.parse(json);
    return parsed.map((f) => ({
        checkId: String(f.checkId ?? 'gate'),
        severity: f.severity === 'block' ? 'block' : 'warn',
        message: String(f.message ?? ''),
        source: 'agent'
    }));
}

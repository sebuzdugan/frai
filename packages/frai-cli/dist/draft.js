/**
 * `frai draft`: fills the FRAI Gate answers from the code, then writes them into the spec.
 *
 * It prefers the local agent (Claude Code or ANTHROPIC_API_KEY) because that reads the whole repo
 * and nothing leaves the machine. With no key it falls back to the hosted drafter on frai.cc, and
 * asks first, because that means sending short excerpts of the AI-related files.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { Scanners } from 'frai-core';
const HOSTED = process.env.FRAI_API_URL || 'https://www.frai.cc';
const MAX_FILES = 8;
const MAX_LINES = 120;
const bold = (s) => `[1m${s}[0m`;
const dim = (s) => `[2m${s}[0m`;
function excerpt(file) {
    try {
        return readFileSync(file, 'utf8').split('\n').slice(0, MAX_LINES).join('\n');
    }
    catch {
        return '';
    }
}
function hasLocalAgentAuth() {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN);
}
async function draftLocally(root) {
    try {
        const { draftGateSection } = (await import('frai-gate'));
        return await draftGateSection(root);
    }
    catch (error) {
        console.log(dim(`  Local agent unavailable (${error instanceof Error ? error.message.split('\n')[0] : 'unknown'}).`));
        return null;
    }
}
async function draftHosted(root, files, libraries, projectName, yes) {
    const payload = {
        project: projectName,
        libraries,
        files: files.slice(0, MAX_FILES).map((f) => ({ path: path.relative(root, f), excerpt: excerpt(f) })),
    };
    if (!yes && !process.stdin.isTTY) {
        // Nobody is there to answer, and sending someone's code on a guess is not ours to make.
        console.log(`\n  This would send ${payload.files.length} file excerpt${payload.files.length === 1 ? '' : 's'} to ${HOSTED}, and there is no terminal to ask.`);
        console.log(dim('  Re-run with --yes to allow it, or set ANTHROPIC_API_KEY to draft locally instead.\n'));
        return null;
    }
    if (!yes) {
        console.log(`\n  FRAI will send these files to ${HOSTED} to draft your answers:`);
        payload.files.forEach((f) => console.log(dim(`    ${f.path}`)));
        console.log(dim('  Nothing is stored. Skip .env files and secrets are never read.'));
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = (await rl.question('  Send them? [y/N] ')).trim().toLowerCase();
        rl.close();
        if (answer !== 'y' && answer !== 'yes') {
            console.log('  Stopped. Nothing was sent.');
            return null;
        }
    }
    console.log(dim('  Drafting…'));
    let res;
    try {
        res = await fetch(`${HOSTED}/api/cli/draft-spec`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(180000),
        });
    }
    catch (error) {
        const timedOut = error instanceof Error && error.name === 'TimeoutError';
        console.log(`  ${timedOut ? 'The drafter took over three minutes and was stopped. Try again.' : `Could not reach ${HOSTED}.`}`);
        return null;
    }
    const body = (await res.json().catch(() => null));
    if (!res.ok || !body?.section) {
        console.log(`  ${body?.error ?? `The hosted drafter failed (${res.status}).`}`);
        return null;
    }
    return body.section;
}
/** Replaces the gate section of an existing spec, keeping everything the team wrote above it. */
function mergeIntoSpec(specPath, section) {
    const spec = readFileSync(specPath, 'utf8');
    const marker = spec.indexOf('## FRAI Gate');
    if (marker === -1)
        return false;
    const afterGate = spec.indexOf('\n---', marker);
    const tail = afterGate === -1 ? '' : spec.slice(afterGate);
    writeFileSync(specPath, `${spec.slice(0, marker)}## FRAI Gate\n\n${section.trim()}\n${tail}`);
    return true;
}
export async function runDraft(options = {}) {
    const root = options.root ?? process.cwd();
    const pkg = existsSync(path.join(root, 'package.json'))
        ? JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
        : {};
    const scan = Scanners.scanCodebase({ root });
    const files = scan.aiFiles ?? [];
    if (files.length === 0) {
        console.log('\n  No AI code found in this project, so there is nothing to draft.');
        console.log(dim('  If your AI lives elsewhere, run this in that repo.\n'));
        return 0;
    }
    const libraryNames = new Set();
    for (const libs of Object.values((scan.aiLibraryMatches ?? {}))) {
        for (const lib of libs ?? [])
            libraryNames.add(lib);
    }
    console.log(`\n${bold('Drafting your gate answers')}`);
    console.log(dim(`  ${files.length} AI file${files.length === 1 ? '' : 's'}${libraryNames.size ? `, using ${[...libraryNames].join(', ')}` : ''}`));
    let section = null;
    if (hasLocalAgentAuth()) {
        console.log(dim('  Using your local Claude agent, nothing leaves this machine.'));
        section = await draftLocally(root);
    }
    if (!section) {
        section = await draftHosted(root, files, [...libraryNames], pkg.name ?? path.basename(root), Boolean(options.yes));
    }
    if (!section)
        return 1;
    if (options.print) {
        console.log(`\n${section}\n`);
        return 0;
    }
    const specPath = ['FRAI-SPEC.md', 'frai-spec.md'].map((f) => path.join(root, f)).find((f) => existsSync(f));
    if (specPath && mergeIntoSpec(specPath, section)) {
        console.log(`\n  Wrote the answers into ${path.relative(root, specPath)}.`);
        console.log(dim('  Read them, replace every "NEEDS HUMAN INPUT", then run: npx frai gate check FRAI-SPEC.md\n'));
        return 0;
    }
    const out = path.resolve(root, options.out ?? 'rai-gate-draft.md');
    writeFileSync(out, `${section}\n`);
    console.log(`\n  Wrote ${path.relative(root, out)}.`);
    console.log(dim('  Paste it into your spec under "## FRAI Gate", or run npx frai gate init first.\n'));
    return 0;
}

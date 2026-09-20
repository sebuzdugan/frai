/**
 * `frai` with no arguments: one command that works out what this project is, checks it, and says
 * what to do next. No questions, no API key, no flags to learn.
 *
 * It scans the code for AI usage, finds the public URL by itself, asks the hosted checker whether
 * that site tells people about its AI, runs the gate if a spec exists, and prints the next command.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Scanners } from 'frai-core';
const HOSTED = process.env.FRAI_API_URL || 'https://www.frai.cc';
const SPEC_CANDIDATES = ['FRAI-SPEC.md', 'frai-spec.md', 'docs/FRAI-SPEC.md', '.github/FRAI-SPEC.md'];
const dim = (s) => `[2m${s}[0m`;
const bold = (s) => `[1m${s}[0m`;
const green = (s) => `[32m${s}[0m`;
const amber = (s) => `[33m${s}[0m`;
const red = (s) => `[31m${s}[0m`;
function readJson(file) {
    try {
        return JSON.parse(readFileSync(file, 'utf8'));
    }
    catch {
        return null;
    }
}
/** Looks for the project's public address the way a colleague would: package.json, env files, README. */
export function detectSiteUrl(root) {
    const pkg = readJson(path.join(root, 'package.json'));
    const homepage = typeof pkg?.homepage === 'string' ? pkg.homepage : '';
    if (/^https?:\/\//i.test(homepage) && !homepage.includes('github.com'))
        return homepage;
    for (const envFile of ['.env.production', '.env.local', '.env']) {
        const file = path.join(root, envFile);
        if (!existsSync(file))
            continue;
        const text = readFileSync(file, 'utf8');
        const match = text.match(/^(?:NEXT_PUBLIC_(?:APP|SITE)_URL|SITE_URL|PUBLIC_URL|APP_URL)\s*=\s*"?(https?:\/\/[^\s"']+)"?/m);
        if (match && !match[1].includes('localhost'))
            return match[1];
    }
    for (const readme of ['README.md', 'readme.md']) {
        const file = path.join(root, readme);
        if (!existsSync(file))
            continue;
        const text = readFileSync(file, 'utf8');
        const match = text.match(/https?:\/\/(?!github\.com|www\.npmjs\.com|img\.shields\.io|badge)[a-z0-9.-]+\.[a-z]{2,}[^\s)"']*/i);
        if (match)
            return match[0];
    }
    return null;
}
function findSpec(root) {
    for (const candidate of SPEC_CANDIDATES) {
        const file = path.join(root, candidate);
        if (existsSync(file))
            return file;
    }
    return null;
}
async function runGate(specPath) {
    try {
        const { validateSpec } = (await import('frai-gate'));
        const result = validateSpec(readFileSync(specPath, 'utf8'));
        const findings = result.findings ?? [];
        return {
            verdict: (result.verdict ?? 'BLOCK').toUpperCase(),
            blocked: findings.filter((f) => f.severity === 'block').length,
            lines: findings
                .filter((f) => f.severity === 'block' || f.severity === 'warn')
                .slice(0, 4)
                .map((f) => f.message.trim()),
        };
    }
    catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return null;
    }
}
/** People type "example.com", not "https://example.com". Accept both. */
function normalizeUrl(input) {
    const trimmed = input.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
async function checkSite(url) {
    try {
        const res = await fetch(`${HOSTED}/api/public-scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        const body = (await res.json());
        if (!res.ok)
            return { error: String(body.error ?? `The check failed (${res.status}).`) };
        return {
            url: String(body.url ?? url),
            verdict: body.verdict,
            headline: String(body.headline ?? ''),
            services: body.services ?? [],
            pagesChecked: body.pagesChecked ?? [],
        };
    }
    catch (error) {
        return { error: error instanceof Error ? error.message : 'The check could not reach frai.cc.' };
    }
}
export async function runReview(options = {}) {
    const root = options.root ?? process.cwd();
    const pkg = readJson(path.join(root, 'package.json'));
    const projectName = typeof pkg?.name === 'string' ? pkg.name : path.basename(root);
    const scan = options.siteOnly ? { aiFiles: [], totalFiles: 0, aiLibraryMatches: {} } : Scanners.scanCodebase({ root });
    const libraryCounts = new Map();
    for (const libs of Object.values((scan.aiLibraryMatches ?? {}))) {
        for (const lib of libs ?? [])
            libraryCounts.set(lib, (libraryCounts.get(lib) ?? 0) + 1);
    }
    const libraries = [...libraryCounts.entries()].sort((a, b) => b[1] - a[1]);
    const aiInCode = scan.aiFiles.length > 0;
    const rawUrl = options.url ?? (options.offline ? null : detectSiteUrl(root));
    const url = rawUrl ? normalizeUrl(rawUrl) : null;
    if (options.siteOnly && !url) {
        console.log('\n  Pass a site to check, for example: frai check yourcompany.com\n');
        return 2;
    }
    const site = url && !options.offline ? await checkSite(url) : null;
    const specPath = options.siteOnly ? null : findSpec(root);
    const gate = specPath ? await runGate(specPath) : null;
    if (options.json) {
        console.log(JSON.stringify({
            project: projectName,
            code: { aiFiles: scan.aiFiles.map((f) => path.relative(root, f)), libraries: Object.fromEntries(libraries) },
            site,
            spec: specPath ? path.relative(root, specPath) : null,
            gate,
        }, null, 2));
    }
    else {
        const out = ['', bold(options.siteOnly ? 'FRAI site check' : `FRAI review: ${projectName}`), ''];
        if (!options.siteOnly) {
            out.push(bold('Code'));
            if (aiInCode) {
                const names = libraries.slice(0, 4).map(([name]) => name).join(', ');
                out.push(`  ${amber('AI found')}  ${scan.aiFiles.length} file${scan.aiFiles.length === 1 ? '' : 's'}${names ? ` using ${names}` : ''}`);
                scan.aiFiles.slice(0, 3).forEach((f) => out.push(dim(`    ${path.relative(root, f)}`)));
                if (scan.aiFiles.length > 3)
                    out.push(dim(`    and ${scan.aiFiles.length - 3} more`));
            }
            else {
                out.push(`  ${dim('No AI libraries or model calls found in this repo.')}`);
            }
            out.push('');
        }
        out.push(bold('Site'));
        if (options.offline) {
            out.push(`  ${dim('Skipped, you asked for --offline.')}`);
        }
        else if (!url) {
            out.push(`  ${dim('No public URL found. Pass one: frai --url yourcompany.com')}`);
        }
        else if (site && 'error' in site) {
            out.push(`  ${dim(`${url}: ${site.error}`)}`);
        }
        else if (site && !('error' in site)) {
            const mark = site.verdict === 'gap' ? amber('needs a notice') : site.verdict === 'review' ? green('notice found') : dim('no AI found');
            out.push(`  ${site.url}  ${mark}`);
            out.push(dim(`    ${site.headline}`));
            if (site.services.length)
                out.push(dim(`    found: ${site.services.map((s) => s.name).join(', ')}`));
        }
        out.push('');
        if (!options.siteOnly) {
            out.push(bold('Spec'));
            if (!specPath) {
                out.push(`  ${dim('No FRAI-SPEC.md in this repo.')}`);
            }
            else if (!gate) {
                out.push(`  ${path.relative(root, specPath)} ${dim('(could not run the gate)')}`);
            }
            else {
                const mark = gate.verdict === 'PASS' ? green('PASS') : gate.verdict === 'WARN' ? amber('WARN') : red('BLOCK');
                out.push(`  ${path.relative(root, specPath)}  ${mark}`);
                gate.lines.forEach((l) => out.push(dim(`    ${l}`)));
            }
            out.push('');
        }
        const next = [];
        if (!specPath && aiInCode)
            next.push('npx frai gate init --ci    add the spec and the CI check');
        if (specPath && gate && gate.verdict === 'BLOCK') {
            // The drafter reads your code, so it only helps when there is AI code to read.
            const answerByHand = gate.lines.every((l) => l.includes('needs your answer')) || !aiInCode;
            next.push(answerByHand
                ? `answer the ${gate.blocked} open field${gate.blocked === 1 ? '' : 's'} in ${path.relative(root, specPath)}, then: npx frai gate check ${path.relative(root, specPath)}`
                : `npx frai draft             fill the ${gate.blocked} open answer${gate.blocked === 1 ? '' : 's'} from your code`);
        }
        if (specPath && !gate)
            next.push('npx frai gate check FRAI-SPEC.md   run the gate on your spec');
        if (!url && !options.offline && !options.siteOnly)
            next.push('npx frai check yourcompany.com     check the live site too');
        if (site && !('error' in site) && site.verdict === 'gap') {
            next.push('add a notice where people meet the AI, for example: "You are chatting with an AI assistant."');
        }
        if (next.length === 0)
            next.push('nothing to fix right now. Re-run this after your next AI change.');
        out.push(bold('Next'));
        next.forEach((n) => out.push(`  ${n}`));
        out.push('');
        console.log(out.join('\n'));
    }
    if (options.ci) {
        const siteGap = site && !('error' in site) && site.verdict === 'gap';
        const gateBlocked = gate?.verdict === 'BLOCK';
        const missingSpec = aiInCode && !specPath;
        if (siteGap || gateBlocked || missingSpec)
            return 1;
    }
    return 0;
}

/**
 * `frai` with no arguments: one command that works out what this project is, checks it, and says
 * what to do next. No questions, no API key, no flags to learn.
 *
 * It scans the code for AI usage, finds the public URL by itself, asks the hosted checker whether
 * that site tells people about its AI, runs the gate if a spec exists, and prints the next command.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Scanners } from 'frai-core';
import { findNoticeInCode, unmentionedInSpec } from './code-checks.js';
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
        const match = text.match(/^(?:NEXT_PUBLIC_(?:APP|SITE)_URL|SITE_URL|PUBLIC_URL|APP_URL)\s*=\s*["']?(https?:\/\/[^\s"']+)["']?/m);
        if (match && !/localhost|127\.0\.0\.1/.test(match[1]))
            return match[1];
    }
    for (const readme of ['README.md', 'readme.md']) {
        const file = path.join(root, readme);
        if (!existsSync(file))
            continue;
        const url = siteFromReadme(readFileSync(file, 'utf8'));
        if (url)
            return url;
    }
    return null;
}
// Links in a README that are never the project's own site: code hosts, package registries,
// badges, deploy buttons, dev environments and social posts.
const NOT_THE_SITE = /^(?:[\w-]+\.)*(?:github\.com|githubusercontent\.com|github\.io\/[^/]+\/?$|gitlab\.com|bitbucket\.org|npmjs\.com|npmjs\.org|pypi\.org|shields\.io|badgen\.net|badge\.fury\.io|codecov\.io|codespaces\.new|gitpod\.io|stackblitz\.com|codesandbox\.io|replit\.com|x\.com|twitter\.com|linkedin\.com|youtube\.com|youtu\.be|discord\.gg|discord\.com|t\.me|reddit\.com|medium\.com|producthunt\.com|vercel\.com|netlify\.com|railway\.app|render\.com|heroku\.com|deploy\.cloud\.run|img\.|opensource\.org|creativecommons\.org|star-history\.com|contrib\.rocks|platform\.openai\.com|console\.anthropic\.com|aistudio\.google\.com|makersuite\.google\.com|console\.groq\.com|console\.mistral\.ai|dashboard\.cohere\.com|huggingface\.co\/settings|portal\.azure\.com)/i;
/** Hosts where a badge usually links to the running app itself: a "Streamlit App" or "Open in Spaces" badge. */
const APP_HOSTS = /\.(?:streamlit\.app|vercel\.app|netlify\.app|pages\.dev|hf\.space|fly\.dev|onrender\.com|up\.railway\.app|herokuapp\.com)$/i;
const pathOf = (url) => {
    try {
        return new URL(url).pathname;
    }
    catch {
        return '';
    }
};
/** The project's own site from its README, or null. Badges, images and deploy buttons do not count. */
export function siteFromReadme(markdown) {
    const text = markdown
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, ' ') // [![badge](img)](link)
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // ![image](src)
        .replace(/<img[^>]*>/gi, ' ');
    const candidates = [];
    // Badges are dropped, except one that links to the app itself.
    for (const m of markdown.matchAll(/\[!\[[^\]]*\]\([^)]*\)\]\((https?:\/\/[^)\s]+)\)/g)) {
        try {
            if (APP_HOSTS.test(new URL(m[1]).hostname))
                candidates.push({ url: m[1], preferred: true });
        }
        catch {
            // not a URL
        }
    }
    for (const line of text.split('\n')) {
        for (const m of line.matchAll(/https?:\/\/[^\s)"'<>\]]+/gi)) {
            const url = m[0].replace(/[.,;:!?]+$/, '');
            let host = '';
            try {
                const u = new URL(url);
                host = u.hostname + u.pathname;
            }
            catch {
                continue;
            }
            if (NOT_THE_SITE.test(host) || /\.(?:png|jpe?g|gif|svg|webp)(?:\?|$)/i.test(url) || /localhost|127\.0\.0\.1/.test(url))
                continue;
            if (/api[-_]?keys?\b|\/settings\/tokens/i.test(pathOf(url)))
                continue;
            candidates.push({ url, preferred: /\b(?:demo|live|website|homepage|try it|visit|app)\b/i.test(line) });
        }
    }
    return (candidates.find((c) => c.preferred) ?? candidates[0])?.url ?? null;
}
const PREDICTIVE_ML = /^(?:sklearn|scikit-learn|xgboost|lightgbm|catboost|statsmodels|prophet|pmdarima)$/i;
/** AI SDKs people actually install. Matched against manifests, so a dependency counts even when
 *  the code that calls it is in a file type the scanner does not read. */
const AI_PACKAGES = [
    'openai', '@anthropic-ai/sdk', '@anthropic-ai/claude-agent-sdk', 'ai', '@ai-sdk/openai', '@ai-sdk/anthropic',
    'langchain', 'llamaindex', '@google/generative-ai', '@google/genai', 'cohere-ai', 'replicate',
    '@huggingface/inference', 'groq-sdk', '@mistralai/mistralai', 'ollama', '@azure/openai',
];
const AI_PY_PACKAGES = ['openai', 'anthropic', 'langchain', 'llama-index', 'transformers', 'google-generativeai', 'cohere', 'litellm', 'ollama'];
/** Reads the manifests, not the code: "you depend on an AI SDK" is worth saying on its own. */
/** package.json files of the workspace packages in a monorepo (npm/yarn workspaces, pnpm-workspace.yaml). */
function workspaceManifests(root) {
    const pkg = readJson(path.join(root, 'package.json'));
    const globs = [];
    const ws = pkg?.workspaces;
    if (Array.isArray(ws))
        globs.push(...ws.filter((g) => typeof g === 'string'));
    else if (ws && typeof ws === 'object' && Array.isArray(ws.packages))
        globs.push(...(ws.packages));
    const pnpm = path.join(root, 'pnpm-workspace.yaml');
    if (existsSync(pnpm)) {
        for (const m of readFileSync(pnpm, 'utf8').matchAll(/^\s*-\s*['"]?([^'"\n#]+?)['"]?\s*$/gm))
            globs.push(m[1]);
    }
    const files = [];
    for (const glob of globs) {
        if (glob.startsWith('!'))
            continue;
        const base = glob.replace(/\/\*\*?$/, '');
        if (glob.endsWith('*')) {
            try {
                for (const dir of readdirSync(path.join(root, base)))
                    files.push(path.join(root, base, dir, 'package.json'));
            }
            catch {
                // not a directory
            }
        }
        else {
            files.push(path.join(root, base, 'package.json'));
        }
    }
    return files.filter((f) => existsSync(f)).slice(0, 100);
}
export function declaredAiDependencies(root) {
    const found = new Set();
    for (const manifest of [path.join(root, 'package.json'), ...workspaceManifests(root)]) {
        const pkg = readJson(manifest);
        const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
        for (const name of Object.keys(deps ?? {})) {
            if (AI_PACKAGES.includes(name) || name.startsWith('@ai-sdk/') || name.startsWith('@langchain/'))
                found.add(name);
        }
    }
    for (const manifest of ['requirements.txt', 'pyproject.toml', 'Pipfile']) {
        const file = path.join(root, manifest);
        if (!existsSync(file))
            continue;
        let text = '';
        try {
            text = readFileSync(file, 'utf8').toLowerCase();
        }
        catch {
            continue;
        }
        for (const name of AI_PY_PACKAGES) {
            if (new RegExp(`(^|[\\s"'\\[])${name.replace('-', '[-_]')}\\b`, 'm').test(text))
                found.add(name);
        }
    }
    return [...found];
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
const SITE_CHECK_TIMEOUT_MS = 120000;
async function checkSite(url) {
    try {
        const res = await fetch(`${HOSTED}/api/public-scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
            signal: AbortSignal.timeout(SITE_CHECK_TIMEOUT_MS),
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
            skippedByRobots: body.skippedByRobots ?? [],
            noticeSeen: Array.isArray(body.disclosureEvidence) && body.disclosureEvidence.length > 0,
        };
    }
    catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
            return { error: 'The site check took over two minutes and was stopped. Try again, or check the site at frai.cc.' };
        }
        const reason = error instanceof Error ? error.message : String(error);
        return { error: /fetch failed|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(reason) ? `could not reach ${HOSTED}` : reason };
    }
}
async function requestReport(url, email, watch) {
    try {
        const res = await fetch(`${HOSTED}/api/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, email, watch, source: 'cli' }),
            signal: AbortSignal.timeout(30000),
        });
        const body = (await res.json().catch(() => ({})));
        if (!res.ok || !body.reportUrl)
            return { error: body.error ?? `The report could not be started (${res.status}).` };
        return { reportUrl: body.reportUrl };
    }
    catch {
        return { error: `could not reach ${HOSTED}` };
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
    const declared = options.siteOnly ? [] : declaredAiDependencies(root);
    const aiInCode = scan.aiFiles.length > 0 || declared.length > 0;
    const rawUrl = options.url ?? (options.offline ? null : detectSiteUrl(root));
    const url = rawUrl ? normalizeUrl(rawUrl) : null;
    if (options.siteOnly && !url) {
        console.log('\n  Pass a site to check, for example: frai check yourcompany.com\n');
        return 2;
    }
    if (url && !options.offline && !options.json) {
        // The hosted check reads several pages, so say what is happening instead of going quiet.
        process.stderr.write(dim(`  checking ${url} …\n`));
    }
    const site = url && !options.offline ? await checkSite(url) : null;
    const report = url && options.email && site && !('error' in site) ? await requestReport(url, options.email, Boolean(options.watch)) : null;
    const specPath = options.siteOnly ? null : options.spec ? (existsSync(path.resolve(root, options.spec)) ? path.resolve(root, options.spec) : null) : findSpec(root);
    const gate = specPath ? await runGate(specPath) : null;
    // Only the repository can answer these: is the notice in the UI code, and does the spec still
    // name every AI provider the code now uses?
    const noticeInCode = aiInCode && !options.siteOnly ? findNoticeInCode(root) : [];
    const libraryNames = [...libraries.map(([name]) => name), ...declared];
    // Classic machine learning (a scikit-learn model scoring rows) talks to no one and generates no
    // content, so "You're chatting with an AI assistant" is the wrong advice for it.
    const predictiveOnly = libraryNames.length > 0 && libraryNames.every((n) => PREDICTIVE_ML.test(n));
    // The template's HTML comments carry example answers ("OpenAI retention 30 days"); only the
    // spec's own words count when asking whether it names the AI the code uses.
    const staleFor = specPath ? unmentionedInSpec(libraryNames, readFileSync(specPath, 'utf8').replace(/<!--[\s\S]*?-->/g, ' ')) : [];
    if (options.json) {
        console.log(JSON.stringify({
            project: projectName,
            code: {
                aiFiles: scan.aiFiles.map((f) => path.relative(root, f)),
                libraries: Object.fromEntries(libraries),
                declaredDependencies: declared,
                noticeInCode,
            },
            site,
            report,
            spec: specPath ? path.relative(root, specPath) : null,
            specMissingProviders: staleFor,
            gate,
        }, null, 2));
    }
    else {
        const out = ['', bold(options.siteOnly ? 'FRAI site check' : `FRAI review: ${projectName}`), ''];
        if (!options.siteOnly) {
            out.push(bold('Code'));
            const aiFilesFound = scan.aiFiles.length > 0;
            if (aiFilesFound) {
                const names = libraries.slice(0, 4).map(([name]) => name).join(', ');
                out.push(`  ${amber('AI found')}  ${scan.aiFiles.length} file${scan.aiFiles.length === 1 ? '' : 's'}${names ? ` using ${names}` : ''}`);
                scan.aiFiles.slice(0, 3).forEach((f) => out.push(dim(`    ${path.relative(root, f)}`)));
                if (scan.aiFiles.length > 3)
                    out.push(dim(`    and ${scan.aiFiles.length - 3} more`));
            }
            else if (declared.length) {
                out.push(`  ${amber('AI found')}  ${declared.join(', ')} in your dependencies, no calls found in the files we read`);
            }
            else {
                out.push(`  ${dim('No AI libraries or model calls found in this repo.')}`);
            }
            // Only worth a line when the manifest names something the code scan did not already show.
            const extraDeclared = declared.filter((d) => !libraries.some(([name]) => d === name || d.includes(name)));
            if (aiFilesFound && extraDeclared.length)
                out.push(dim(`    also in your dependencies: ${extraDeclared.join(', ')}`));
            if (aiInCode) {
                if (noticeInCode.length) {
                    const n = noticeInCode[0];
                    out.push(`  ${green('notice in code')}  ${n.file}:${n.line}`);
                    out.push(dim(`    ${n.text}`));
                }
                else if (predictiveOnly) {
                    out.push(`  ${dim('no notice in code')}  this AI predicts rather than chats or generates, so a chat notice may not apply`);
                }
                else {
                    out.push(`  ${amber('no notice in code')}  no file tells people they are talking to AI`);
                }
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
            const mark = site.verdict === 'gap'
                ? amber('needs a notice')
                : site.verdict === 'review'
                    ? site.noticeSeen
                        ? green('notice found')
                        : amber('AI features, no notice seen')
                    : dim('no AI found');
            out.push(`  ${site.url}  ${mark}`);
            out.push(dim(`    ${site.headline}`));
            if (site.services.length)
                out.push(dim(`    found: ${site.services.map((s) => s.name).join(', ')}`));
            out.push(dim(`    read ${site.pagesChecked.length} page${site.pagesChecked.length === 1 ? '' : 's'}${site.skippedByRobots?.length ? `, ${site.skippedByRobots.length} skipped because robots.txt asks` : ''}`));
            if (report && 'reportUrl' in report)
                out.push(`  ${green('full report')} on its way to ${options.email}: ${report.reportUrl}`);
            if (report && 'error' in report)
                out.push(dim(`    full report: ${report.error}`));
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
            if (specPath && staleFor.length) {
                out.push(`  ${amber('out of date')}  your code uses ${staleFor.join(', ')}; ${path.relative(root, specPath)} never mentions ${staleFor.length === 1 ? 'it' : 'them'}`);
            }
            out.push('');
        }
        const next = [];
        if (!specPath && aiInCode)
            next.push('npx frai init              add the spec and the CI check');
        if (specPath && gate && gate.verdict === 'BLOCK') {
            // The drafter reads your code, so it only helps when there is AI code to read.
            const answerByHand = gate.lines.every((l) => l.includes('needs your answer')) || !aiInCode;
            next.push(answerByHand
                ? `answer the ${gate.blocked} open field${gate.blocked === 1 ? '' : 's'} in ${path.relative(root, specPath)}, then: npx frai gate check ${path.relative(root, specPath)}`
                : `npx frai draft             fill the ${gate.blocked} open answer${gate.blocked === 1 ? '' : 's'} from your code`);
        }
        if (specPath && !gate)
            next.push('npx frai gate check FRAI-SPEC.md   run the gate on your spec');
        if (specPath && staleFor.length) {
            next.push(`update ${path.relative(root, specPath)} for ${staleFor.join(', ')} (data, oversight, notice), then: npx frai gate check ${path.relative(root, specPath)}`);
        }
        const siteHasNotice = site && !('error' in site) && site.verdict === 'review' && site.noticeSeen;
        if (aiInCode && predictiveOnly && !noticeInCode.length) {
            next.push(`your AI (${libraryNames.join(', ')}) makes predictions. Article 50 notices are for chatbots and generated content; if the predictions decide things about people (credit, hiring, insurance), check the high-risk rules instead`);
        }
        else if (aiInCode && !noticeInCode.length && !siteHasNotice) {
            const where = scan.aiFiles[0] ? ` next to the UI that shows what ${path.relative(root, scan.aiFiles[0])} returns` : '';
            next.push(`show a notice${where}: "You're chatting with an AI assistant."`);
        }
        if (!url && !options.offline && !options.siteOnly)
            next.push('npx frai check yourcompany.com     check the live site too');
        if (site && !('error' in site) && site.verdict === 'gap' && !next.some((n) => n.startsWith('show a notice'))) {
            next.push('add a notice where people meet the AI, for example: "You are chatting with an AI assistant."');
        }
        if (site && 'error' in site) {
            next.push(/this hour/i.test(site.error)
                ? 'the site check did not run: 5 free checks an hour. Try again later, or check it at https://frai.cc'
                : 'the site check did not run. Try again in a minute, or check it at https://frai.cc');
        }
        if (site && !('error' in site) && !options.email && site.verdict !== 'no-ai') {
            next.push(`npx frai check ${new URL(site.url).hostname} --email you@company.com   page-by-page report, up to 10 pages`);
        }
        if (specPath && gate?.verdict === 'WARN')
            next.push(`read the gate's warnings: npx frai gate check ${path.relative(root, specPath)}`);
        if (specPath && !gate)
            next.push('the gate could not run. Install frai-gate (npm i -D frai-gate) or run: npx frai-gate check FRAI-SPEC.md');
        if (next.length === 0)
            next.push('nothing to fix right now. Re-run this after your next AI change.');
        out.push(bold('Next'));
        next.forEach((n) => out.push(`  ${n}`));
        out.push('');
        console.log(out.join('\n'));
    }
    // `frai check` is only the site check: when it could not run, the command failed.
    if (options.siteOnly && site && 'error' in site)
        return 1;
    if (options.ci) {
        const siteGap = site && !('error' in site) && site.verdict === 'gap';
        const gateBlocked = gate?.verdict === 'BLOCK';
        const missingSpec = aiInCode && !specPath;
        // A spec that passes but no longer names the AI in the code is the failure the gate alone misses.
        const staleSpec = staleFor.length > 0;
        // A spec the gate could not read is not a pass.
        const gateBroken = Boolean(specPath) && !gate;
        if (siteGap || gateBlocked || missingSpec || staleSpec || gateBroken)
            return 1;
    }
    return 0;
}

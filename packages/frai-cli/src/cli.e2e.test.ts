/**
 * End-to-end: the built CLI (dist/) on small projects made for each case found in the
 * 2026-10-13 test run. Offline, so it runs in CI. Cases that need the hosted site check run only
 * with FRAI_LIVE=1 (they use the free check, 5 an hour per address).
 *
 * Build first: pnpm build, then pnpm --filter frai exec vitest run.
 */
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterAll, describe, expect, it } from 'vitest';
import { detectSiteUrl } from './review.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(here, '../dist/index.js');
const GATE = path.resolve(here, '../../frai-gate/dist/cli.js');
const work = mkdtempSync(path.join(tmpdir(), 'frai-e2e-'));
afterAll(() => rmSync(work, { recursive: true, force: true }));

/** Make a project from { 'path/file': 'contents' }. */
function project(name: string, files: Record<string, string>): string {
  const dir = path.join(work, name);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), text);
  }
  mkdirSync(dir, { recursive: true });
  return dir;
}

function run(cwd: string, ...args: string[]): { out: string; code: number } {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
  return { out: `${r.stdout}${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, ''), code: r.status ?? -1 };
}

const OPENAI = { 'package.json': '{"dependencies":{"openai":"4"}}', 'src/ai.js': 'import OpenAI from "openai";\nexport const c = new OpenAI();\n' };

describe.skipIf(!existsSync(CLI))('frai CLI end to end', () => {
  describe('commands', () => {
    const empty = project('empty', { 'README.md': '# x\n' });

    it('CLI-01d: rejects an unknown command', () => {
      const r = run(empty, 'ci');
      expect(r.code).toBe(1);
      expect(r.out).toContain('Unknown command');
    });

    it('CLI-01e: a typo suggests frai check', () => {
      const r = run(empty, 'chek', 'example.com');
      expect(r.code).toBe(1);
      expect(r.out).toContain('frai check');
    });

    it('CLI-01b: help shows what frai is for, not the old documentation options', () => {
      const r = run(empty, '--help');
      expect(r.out).toContain('--offline');
      for (const old of ['--scan', '--setup', '--key', '--list-docs', '--export-pdf', '--show-config']) expect(r.out).not.toContain(old);
    });

    it('old options still work for people who use them', () => {
      expect(run(empty, '--show-config').code).toBe(0);
    });
  });

  describe('what counts as AI', () => {
    it('CLI-03c/03d: everyday string and validation helpers are not AI, and CI passes', () => {
      const dir = project('plain', {
        'package.json': '{"dependencies":{"ajv":"8"}}',
        'src/slug.js': 'export const slug = (t) => t.normalize("NFKD").toLowerCase();\n',
        'src/validate.js': 'import Ajv from "ajv";\nexport const v = new Ajv().compile({});\nexport const e = new TextEncoder().encode("x");\n',
      });
      const r = run(dir, '--ci', '--offline');
      expect(r.out).not.toContain('AI found');
      expect(r.code).toBe(0);
    });

    it('CLI-06c: the newest AI SDK (streamText from "ai") is found', () => {
      const dir = project('sdk5', {
        'package.json': '{"dependencies":{"ai":"5"}}',
        'app/api/chat/route.ts': 'import { streamText } from "ai";\nexport async function POST() { return streamText({ model: "openai/gpt-5", prompt: "hi" }).toTextStreamResponse(); }\n',
      });
      expect(run(dir, '--offline').out).toContain('route.ts');
    });

    it('CLI-06e: an OpenAI call in an .mjs file is found', () => {
      const dir = project('mjs', { 'bot.mjs': 'import OpenAI from "openai";\nawait new OpenAI().responses.create({ model: "gpt-5", input: "hi" });\n' });
      expect(run(dir, '--offline').out).toContain('bot.mjs');
    });

    it('CLI-06g: a monorepo with AI only in one workspace fails CI until it has a spec', () => {
      const dir = project('mono', {
        'package.json': '{"private":true,"workspaces":["apps/*"]}',
        'apps/web/package.json': '{"dependencies":{"ai":"5","@ai-sdk/openai":"2"}}',
        'apps/web/app/api/route.ts': 'import { generateText } from "ai";\nimport { openai } from "@ai-sdk/openai";\nexport const run = () => generateText({ model: openai("gpt-5"), prompt: "x" });\n',
      });
      const r = run(dir, '--ci', '--offline');
      expect(r.out).toContain('route.ts');
      expect(r.code).toBe(1);
    });

    it('CLI-07c: a minified third-party bundle is not AI', () => {
      const dir = project('vendor', { 'public/static/vendor.min.js': 'var a=new TextEncoder().encode("x");function b(c){return c.normalize()}' });
      const r = run(dir, '--ci', '--offline');
      expect(r.out).not.toContain('vendor.min.js');
      expect(r.code).toBe(0);
    });
  });

  describe('the notice in code', () => {
    it('CLI-08d: a notice inside a TODO comment does not count', () => {
      const dir = project('todo', {
        ...OPENAI,
        'src/components/Chat.tsx': 'import OpenAI from "openai";\n// TODO: show "You are chatting with an AI assistant" here\nexport const c = new OpenAI();\n',
      });
      expect(run(dir, '--offline').out).toContain('no notice in code');
    });

    it('CLI-08e: a system prompt is not a notice people see', () => {
      const dir = project('prompt', {
        ...OPENAI,
        'src/lib/prompt.ts': 'export const SYSTEM_PROMPT = "You are chatting with an AI assistant. Be brief.";\n',
        'src/server/chat.ts': [
          'import OpenAI from "openai";',
          'const messages = [{ role: "system", content: "You are chatting with an AI assistant." }];',
          'const instructions = `',
          'You are chatting with an AI assistant.',
          '`;',
          'export const c = new OpenAI();',
        ].join('\n'),
      });
      expect(run(dir, '--offline').out).toContain('no notice in code');
    });

    it('a real notice in a component still counts', () => {
      const dir = project('real-notice', {
        ...OPENAI,
        'src/components/ChatHeader.tsx': 'export const Header = () => <p>You are chatting with an AI assistant.</p>;\n',
      });
      expect(run(dir, '--offline').out).toContain('notice in code  src/components/ChatHeader.tsx');
    });

    it('CLI-08f: in a 6,000-file repo a notice in the last folder is found', () => {
      const files: Record<string, string> = { ...OPENAI, 'src/zz/Notice.tsx': 'export const Notice = () => "You are chatting with an AI assistant.";\n' };
      for (let i = 0; i < 6000; i++) files[`src/f${i}.js`] = `export const v${i} = ${i};\n`;
      expect(run(project('big', files), '--offline').out).toContain('zz/Notice.tsx');
    }, 60_000);

    it('CLI-19c: classic machine learning gets prediction advice, not a chat notice', () => {
      const dir = project('sklearn', {
        'requirements.txt': 'scikit-learn==1.5\n',
        'train.py': 'from sklearn.linear_model import LogisticRegression\nmodel = LogisticRegression().fit([[0],[1]], [0,1])\n',
      });
      const r = run(dir, '--offline');
      expect(r.out).toContain('makes predictions');
      expect(r.out).not.toContain("You're chatting with an AI assistant");
    });
  });

  describe('which site is yours', () => {
    it('CLI-09h: a Deploy-with-Vercel badge is not your site', () => {
      const dir = project('badge', {
        ...OPENAI,
        'README.md': '# App\n[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?x=1)\nGet a key at https://platform.openai.com/api-keys\n',
      });
      expect(run(dir, '--json', '--offline').out).not.toContain('vercel.com/button');
    });

    it('CLI-09i: a single-quoted URL in .env.local is read', () => {
      const dir = project('envq', { ...OPENAI, '.env.local': "NEXT_PUBLIC_SITE_URL='https://example.org'\n" });
      expect(detectSiteUrl(dir)).toBe('https://example.org');
    });
  });

  describe('spec and CI', () => {
    it('CLI-11f: a spec that never names OpenAI is out of date, even if the template example does', () => {
      const dir = project('stale', OPENAI);
      spawnSync(process.execPath, [GATE, 'init'], { cwd: dir });
      const r = run(dir, '--ci', '--offline');
      expect(r.out).toContain('out of date');
      expect(r.code).toBe(1);
    });

    it('CLI-18c: AI code with no spec, or an empty spec, fails CI', () => {
      const dir = project('nospec', OPENAI);
      expect(run(dir, '--ci', '--offline').code).toBe(1);
      writeFileSync(path.join(dir, 'FRAI-SPEC.md'), '# empty\n');
      expect(run(dir, '--ci', '--offline').code).toBe(1);
    });

    it('CLI-12c: init on a repo that has a spec keeps it and adds CI', () => {
      const dir = project('init-existing', { 'FRAI-SPEC.md': '# mine\n' });
      expect(run(dir, 'init').code).toBe(0);
      expect(readFileSync(path.join(dir, 'FRAI-SPEC.md'), 'utf8')).toBe('# mine\n');
      const workflow = readFileSync(path.join(dir, '.github/workflows/rai-gate.yml'), 'utf8');
      expect(workflow).toContain('npx frai@latest --ci --offline');
      // CLI-11g: the comment says how to add the live-site check, and following it must work.
      expect(workflow).toContain('replace --offline with --url https://your.site');
    });

    it('CLI-12d/12e: init --out makes the folder, and CI finds the spec there', () => {
      const dir = project('init-out', {});
      expect(run(dir, 'init', '--out', 'specs/AI-SPEC.md').code).toBe(0);
      expect(existsSync(path.join(dir, 'specs/AI-SPEC.md'))).toBe(true);
      const workflow = readFileSync(path.join(dir, '.github/workflows/rai-gate.yml'), 'utf8');
      expect(workflow).toContain('--spec specs/AI-SPEC.md');
      expect(run(dir, '--offline', '--spec', 'specs/AI-SPEC.md').out).toContain('specs/AI-SPEC.md');
    });

    it('CLI-13o: checking a spec that does not exist says so plainly', () => {
      const r = spawnSync(process.execPath, [GATE, 'check', 'nope.md'], { cwd: work, encoding: 'utf8' });
      expect(r.stderr).toContain('No spec at nope.md');
      expect(r.stderr).not.toContain('ENOENT');
      expect(r.status).toBe(2);
    });
  });
});

describe('install size', () => {
  it('CLI-17b: the 231 MB Agent SDK is an optional peer of frai-gate, never a dependency', () => {
    const gate = JSON.parse(readFileSync(path.resolve(here, '../../frai-gate/package.json'), 'utf8'));
    expect(Object.keys(gate.dependencies ?? {})).not.toContain('@anthropic-ai/claude-agent-sdk');
    expect(gate.peerDependenciesMeta?.['@anthropic-ai/claude-agent-sdk']?.optional).toBe(true);
  });
});

describe.skipIf(!existsSync(CLI) || process.env.FRAI_LIVE !== '1')('frai CLI live (FRAI_LIVE=1)', () => {
  it('CLI-15d: frai check --ci fails for a site whose chat has no notice', (ctx) => {
    const r = run(work, 'check', 'crisp.chat', '--ci');
    // 5 free checks an hour per address: hitting that is not a failure of this case.
    if (/free checks for this hour/.test(r.out)) ctx.skip();
    expect(r.out).toContain('needs a notice');
    expect(r.code).toBe(1);
  }, 120_000);

  it('CLI-15e: frai check on an address that does not exist fails', () => {
    expect(run(work, 'check', 'not-a-real-site-frai-test.com').code).toBe(1);
  }, 60_000);
});

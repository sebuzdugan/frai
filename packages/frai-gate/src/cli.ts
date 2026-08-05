#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSpec } from './gate/validate.js';
import { renderJson, renderText } from './gate/report.js';
import { verdictFrom } from './gate/schema.js';
import { draftGateSection, smartReview } from './pipeline/agent.js';

const TEMPLATE_PATH = fileURLToPath(new URL('../assets/rai-spec-template.md', import.meta.url));

const CI_WORKFLOW = `name: Responsible AI Gate
on:
  pull_request:
  push:
    branches: [main]
jobs:
  rai-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      # Blocks the build until every Responsible AI Gate check in the spec is answered.
      - run: npx frai-gate check FRAI-SPEC.md
`;

const HELP = `frai-gate - the FRAI Gate: a Responsible AI Gate for specs

Usage:
  frai-gate init [--out <file>] [--ci]   Drop the RAI spec template into the repo (default: FRAI-SPEC.md);
                                         --ci also writes .github/workflows/rai-gate.yml so the gate
                                         runs on every PR
  frai-gate check <spec.md> [options]    Validate the spec's Responsible AI Gate
      --smart                            Add an AI quality review of the gate answers (Claude Agent SDK)
      --json                             Machine-readable output
  frai-gate draft [--out <file>] [--print]
                                         Scan this repo with a read-only agent and draft a filled-in
                                         gate section grounded in the code (default out: rai-gate-draft.md)

Exit codes: 0 = PASS/WARN, 1 = BLOCK, 2 = usage/error.
The smart commands (draft, check --smart) use the Claude Agent SDK and need Claude Code
authentication or ANTHROPIC_API_KEY. Model override: FRAI_GATE_MODEL (default claude-opus-5).`;

interface Args {
  command: string | undefined;
  positional: string[];
  flags: Map<string, string | true>;
}

function parseArgs(argv: string[]): Args {
  const [command, ...rest] = argv;
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--') && ['out', 'spec'].includes(name)) {
        flags.set(name, next);
        i += 1;
      } else {
        flags.set(name, true);
      }
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, flags };
}

async function cmdInit(args: Args): Promise<number> {
  const out = typeof args.flags.get('out') === 'string' ? (args.flags.get('out') as string) : 'FRAI-SPEC.md';
  const target = path.resolve(process.cwd(), out);
  try {
    await fs.access(target);
    console.error(`Refusing to overwrite existing file: ${out}`);
    return 2;
  } catch {
    // does not exist - good
  }
  const template = await fs.readFile(TEMPLATE_PATH, 'utf8');
  await fs.writeFile(target, template);
  console.log(`Created ${out}. Fill in every FRAI Gate field, then run: frai-gate check ${out}`);
  if (args.flags.has('ci')) {
    const wfDir = path.resolve(process.cwd(), '.github/workflows');
    const wfPath = path.join(wfDir, 'rai-gate.yml');
    try {
      await fs.access(wfPath);
      console.error('Skipping CI workflow: .github/workflows/rai-gate.yml already exists.');
    } catch {
      await fs.mkdir(wfDir, { recursive: true });
      const workflow =
        out === 'FRAI-SPEC.md' ? CI_WORKFLOW : CI_WORKFLOW.replace('FRAI-SPEC.md', out);
      await fs.writeFile(wfPath, workflow);
      console.log('Created .github/workflows/rai-gate.yml - the gate now runs on every PR.');
    }
  }
  return 0;
}

async function cmdCheck(args: Args): Promise<number> {
  const specPath = args.positional[0];
  if (!specPath) {
    console.error('Usage: frai-gate check <spec.md> [--smart] [--json]');
    return 2;
  }
  const markdown = await fs.readFile(path.resolve(process.cwd(), specPath), 'utf8');
  const result = validateSpec(markdown);

  if (args.flags.has('smart') && result.gateSection) {
    const agentFindings = await smartReview(markdown, process.cwd());
    result.findings.push(...agentFindings);
    result.verdict = verdictFrom(result.findings);
  } else if (args.flags.has('smart') && !result.gateSection) {
    console.error('Skipping smart review: no gate section to review.');
  }

  console.log(args.flags.has('json') ? renderJson(result, specPath) : renderText(result, specPath));
  return result.verdict === 'BLOCK' ? 1 : 0;
}

async function cmdDraft(args: Args): Promise<number> {
  const section = await draftGateSection(process.cwd());
  if (args.flags.has('print')) {
    console.log(section);
    return 0;
  }
  const out = typeof args.flags.get('out') === 'string' ? (args.flags.get('out') as string) : 'rai-gate-draft.md';
  await fs.writeFile(path.resolve(process.cwd(), out), `${section}\n`);
  console.log(`Drafted gate section written to ${out}.`);
  console.log('Review it, resolve every "NEEDS HUMAN INPUT" item, paste it into your spec, then run: frai-gate check <spec.md>');
  return 0;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  let code = 0;
  switch (args.command) {
    case 'init':
      code = await cmdInit(args);
      break;
    case 'check':
      code = await cmdCheck(args);
      break;
    case 'draft':
      code = await cmdDraft(args);
      break;
    case undefined:
    case 'help':
    case '--help':
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${args.command}\n`);
      console.log(HELP);
      code = 2;
  }
  process.exitCode = code;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
});

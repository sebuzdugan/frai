import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findNoticeInCode, unmentionedInSpec } from './code-checks.js';

function project(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'frai-cc-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), text);
  }
  return root;
}

describe('findNoticeInCode', () => {
  it('finds the notice in the chat component', () => {
    const root = project({ 'src/components/Chat.tsx': `<p>You're chatting with an AI assistant.</p>` });
    expect(findNoticeInCode(root)[0]).toMatchObject({ file: 'src/components/Chat.tsx', line: 1 });
  });

  it('ignores tests, docs and the spec, which describe a notice but show none', () => {
    const root = project({
      '__tests__/chat.test.ts': `expect(text).toBe("You are chatting with an AI assistant")`,
      'docs/notice.md': 'Write: You are chatting with an AI assistant.',
      'FRAI-SPEC.md': 'Users see: You are chatting with an AI assistant.',
      'src/app.tsx': '<div>Hello</div>',
    });
    expect(findNoticeInCode(root)).toEqual([]);
  });

  it('prefers the screen people see over an example sentence in server code', () => {
    const root = project({
      'app/api/draft/route.ts': 'const example = "You are chatting with an AI assistant."',
      'components/chat/chat-client.tsx': '<p>You are chatting with an AI assistant.</p>',
    });
    expect(findNoticeInCode(root)[0].file).toBe('components/chat/chat-client.tsx');
  });

  it('skips node_modules and hidden folders', () => {
    const root = project({ 'node_modules/x/index.js': '"You are chatting with an AI"', '.cache/a.html': 'You are chatting with an AI' });
    expect(findNoticeInCode(root)).toEqual([]);
  });
});

describe('unmentionedInSpec', () => {
  it('names a provider the code uses and the spec never mentions', () => {
    expect(unmentionedInSpec(['openai', '@anthropic-ai/sdk'], 'We use OpenAI gpt-4o-mini for replies.')).toEqual(['Anthropic']);
  });
  it('counts a model name as mentioning its provider', () => {
    expect(unmentionedInSpec(['openai'], 'Replies come from GPT-4o.')).toEqual([]);
    expect(unmentionedInSpec(['anthropic'], 'Summaries by Claude Sonnet.')).toEqual([]);
  });
  it('says nothing about libraries it does not know', () => {
    expect(unmentionedInSpec(['numpy'], 'Nothing here.')).toEqual([]);
  });
});

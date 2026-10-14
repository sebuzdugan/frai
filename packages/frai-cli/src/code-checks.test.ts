import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectUiText, findNoticeInCode, locateQuote, looksLikeUiText, unmentionedInSpec } from './code-checks.js';

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

describe('comments are not notices', () => {
  it('skips TODO and comment lines', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'frai-cmt-'));
    mkdirSync(path.join(dir, 'components'));
    writeFileSync(path.join(dir, 'components', 'Chat.tsx'), "// TODO(legal): add \"You're chatting with an AI assistant\"\nexport const Chat = () => null\n");
    expect(findNoticeInCode(dir)).toEqual([]);
    writeFileSync(path.join(dir, 'components', 'Chat.tsx'), "export const Chat = () => <p>You're chatting with an AI assistant.</p>\n");
    expect(findNoticeInCode(dir)[0]?.line).toBe(1);
  });
});

describe('notices in the main EU languages, as on the site check', () => {
  it.each([
    ['German', 'Sie chatten mit einem KI-Assistenten.'],
    ['German', 'Ich bin Lena, Ihre KI-Assistentin.'],
    ['French', 'Vous discutez avec une intelligence artificielle.'],
    ['French', 'Je suis votre assistant virtuel.'],
    ['Spanish', 'Estás hablando con un asistente virtual.'],
    ['Italian', 'Stai parlando con un assistente virtuale.'],
    ['Dutch', 'Je chat nu met een AI-assistent.'],
    ['Polish', 'Rozmawiasz z asystentem AI.'],
    ['Portuguese', 'Você está conversando com um assistente virtual.'],
    ['English', "I'm Fin, your AI assistant."],
  ])('finds a %s notice in a component: %s', (_lang, sentence) => {
    const root = project({ 'src/components/Chat.tsx': `<p>${sentence}</p>` });
    expect(findNoticeInCode(root)[0]).toMatchObject({ file: 'src/components/Chat.tsx', line: 1 });
  });

  it('does not take a person introducing themselves for a notice', () => {
    const root = project({ 'src/components/Chat.tsx': '<p>Hallo! Ich bin Anna vom Support-Team.</p>' });
    expect(findNoticeInCode(root)).toEqual([]);
  });
});

describe('collectUiText (for --any-language)', () => {
  it('collects sentences people see, in any language, and leaves code out', () => {
    const root = project({
      'src/components/Chat.tsx': [
        "import { useState } from 'react';",
        '<div className="flex items-center gap-2 rounded-xl">',
        '  <p>Salut! Eu sunt Ana, asistentul virtual bazat pe inteligență artificială.</p>',
        "  <button aria-label=\"Trimite mesajul\">{t('send')}</button>",
        '</div>',
        "const url = 'https://api.example.com/v1/chat';",
      ].join('\n'),
      'src/locales/sv.json': '{ "greeting": "Hej! Du chattar med Lisa, vår AI-assistent." }',
    });
    const texts = collectUiText(root).map((t) => t.text);
    expect(texts).toContain('Salut! Eu sunt Ana, asistentul virtual bazat pe inteligență artificială.');
    expect(texts).toContain('Hej! Du chattar med Lisa, vår AI-assistent.');
    expect(texts).toContain('Trimite mesajul');
    expect(texts.join(' ')).not.toMatch(/react|items-center|https:/);
  });

  it('never collects system prompts, comments or tests', () => {
    const root = project({
      'src/lib/ai.ts': 'const SYSTEM_PROMPT = "Du bist ein hilfreicher Assistent. Antworte kurz.";',
      'src/components/Chat.tsx': '// Ziua bună! Sunt un asistent AI, notă pentru mai târziu.',
      'src/__tests__/chat.test.tsx': 'expect(screen.getByText("Hej! Du chattar med en AI-assistent.")).toBeTruthy()',
    });
    expect(collectUiText(root)).toEqual([]);
  });

  it('stays under the size limit, chat files first', () => {
    const many = Array.from({ length: 80 }, (_, i) => `"Produktbeskrivning nummer ${i}, med fri frakt."`).join('\n');
    const root = project({ 'src/pages/shop.tsx': many, 'src/components/ChatWidget.tsx': '<p>Hej! Du chattar med en AI-assistent.</p>' });
    const texts = collectUiText(root, 500);
    expect(texts[0].file).toBe('src/components/ChatWidget.tsx');
    expect(texts.reduce((n, t) => n + t.text.length + 1, 0)).toBeLessThanOrEqual(500);
  });

  it.each([
    ['flex items-center gap-2', false],
    ['../components/chat-widget', false],
    ['user_message_received', false],
    ['こんにちは！私はAIアシスタントです。', true],
    ['Bună! Sunt Andreea de la echipa de suport.', true],
  ])('looksLikeUiText(%s) is %s', (s, expected) => {
    expect(looksLikeUiText(s)).toBe(expected);
  });

  it('maps the quoted notice back to its file and line', () => {
    const texts = [
      { file: 'a.tsx', line: 3, text: 'Livrare gratuită peste 200 lei' },
      { file: 'chat.tsx', line: 12, text: 'Salut! Eu sunt Ana, asistentul virtual bazat pe inteligență artificială.' },
    ];
    expect(locateQuote(texts, 'Eu sunt Ana, asistentul virtual bazat pe inteligență artificială.')).toMatchObject({ file: 'chat.tsx', line: 12 });
    expect(locateQuote(texts, 'Sunt un asistent AI.')).toBeNull();
  });
});

/**
 * Two checks that only the repository can answer, before anything ships:
 *
 * 1. Does the product's own UI code tell people they are talking to AI? The site check sees the
 *    deployed page; this sees the component that will be deployed next.
 * 2. Is the spec stale? A spec that passed last month does not mention the AI SDK added this week,
 *    and the gate alone cannot notice, because the spec did not change.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const UI_EXTENSIONS = new Set(['.tsx', '.jsx', '.vue', '.svelte', '.astro', '.html', '.ts', '.js', '.mdx', '.json', '.yml', '.yaml', '.liquid', '.erb', '.twig', '.php', '.py']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', '.next', '.git', '.venv', '__pycache__']);
const MAX_FILES = 4000;
const NOT_PRODUCT = /(^|\/)(__tests__|__mocks__|tests?|spec|specs|e2e|fixtures|stories|docs?|examples?|scripts)\/|\.(test|spec|stories)\.[a-z]+$|frai-spec\.md$/i;
const MAX_BYTES = 400_000;

// The same notice phrases the site check looks for, so a notice in code counts the same as one on the page.
const NOTICE = [
  /\byou(?:'re|’re| are)\s+(?:now\s+)?(?:chatting|talking|speaking)\s+(?:with|to)\s+(?:an?\s+)?(?:ai|artificial intelligence|bot|virtual agent|automated assistant)\b/i,
  /\b(?:i am|i'm|i’m|this is)\s+(?:an?\s+)?(?:ai|artificial intelligence|virtual|automated)\s+(?:assistant|agent|chatbot|bot)\b/i,
  /\bthis\s+(?:chat|conversation|assistant|support chat|service)\s+(?:uses|is powered by|is run by)\s+(?:ai|artificial intelligence)\b/i,
  /\b(?:responses|answers|replies|content)\s+(?:are|is|may be)\s+(?:ai[\s-]generated|generated\s+(?:by|with|using)\s+(?:ai|artificial intelligence))\b/i,
];

export interface NoticeInCode {
  file: string;
  line: number;
  text: string;
}

function walk(root: string, dir: string, files: string[]) {
  if (files.length >= MAX_FILES) return;
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (files.length >= MAX_FILES) return;
    if (name.startsWith('.') || SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(root, full, files);
    else if (UI_EXTENSIONS.has(path.extname(name).toLowerCase()) && st.size <= MAX_BYTES) files.push(full);
  }
}

/** Finds notice wording anywhere a user-facing string can live: components, templates, locale files. */
export function findNoticeInCode(root: string): NoticeInCode[] {
  const files: string[] = [];
  walk(root, root, files);
  const hits: NoticeInCode[] = [];
  for (const file of files) {
    // The spec describes the notice and tests assert it; neither is what a visitor sees.
    if (NOT_PRODUCT.test(path.relative(root, file))) continue;
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (NOTICE.some((re) => re.test(lines[i]))) {
        hits.push({ file: path.relative(root, file), line: i + 1, text: lines[i].trim().slice(0, 140) });
        break;
      }
    }
  }
  // What a visitor sees first: components, pages, templates and locale files; server code
  // (API routes, prompts) last, since a sentence there is often an example, not the notice.
  const rank = (f: string) =>
    (/(^|\/)(api|server|lib|backend|prompts?)\//i.test(f) ? 2 : 0) +
    (/(^|\/)(components?|pages|views|templates|layouts|ui|locales|i18n|messages|app)\//i.test(f) ? -1 : 0) +
    (/\.(tsx|jsx|vue|svelte|astro|html|liquid|erb|twig)$/i.test(f) ? -1 : 0) +
    (/(chat|assistant|bot|widget|copilot|messenger)[^/]*$/i.test(f) ? -1 : 0);
  return hits.sort((a, b) => rank(a.file) - rank(b.file)).slice(0, 5);
}

// Words a spec would use for each SDK. "openai" is covered by a spec that says "GPT-4o".
const VENDOR_WORDS: Array<{ match: RegExp; name: string; words: RegExp }> = [
  { match: /openai|@azure\/openai/i, name: 'OpenAI', words: /openai|gpt|chatgpt|azure openai/i },
  { match: /anthropic|claude/i, name: 'Anthropic', words: /anthropic|claude/i },
  { match: /google\.generativeai|google\.genai|@google\/(generative-ai|genai)|vertexai/i, name: 'Google Gemini', words: /gemini|google|vertex/i },
  { match: /cohere/i, name: 'Cohere', words: /cohere/i },
  { match: /mistral/i, name: 'Mistral', words: /mistral/i },
  { match: /groq/i, name: 'Groq', words: /groq/i },
  { match: /replicate/i, name: 'Replicate', words: /replicate/i },
  { match: /huggingface|transformers/i, name: 'Hugging Face', words: /hugging\s?face|transformers/i },
  { match: /ollama/i, name: 'Ollama', words: /ollama|llama/i },
  { match: /langchain/i, name: 'LangChain', words: /langchain/i },
  { match: /llama_index|llamaindex/i, name: 'LlamaIndex', words: /llama\s?index/i },
  { match: /@ai-sdk\/|^ai$/i, name: 'the Vercel AI SDK', words: /ai sdk|vercel ai|ai-sdk/i },
];

/** AI providers the code uses that the spec never names. Empty when the spec covers them all. */
export function unmentionedInSpec(libraries: string[], specText: string): string[] {
  const missing = new Set<string>();
  for (const lib of libraries) {
    const vendor = VENDOR_WORDS.find((v) => v.match.test(lib));
    if (vendor && !vendor.words.test(specText)) missing.add(vendor.name);
  }
  return [...missing];
}

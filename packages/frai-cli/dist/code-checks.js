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
const MAX_FILES = 20000;
const NOT_PRODUCT = /(^|\/)(__tests__|__mocks__|tests?|spec|specs|e2e|fixtures|stories|docs?|examples?|scripts)\/|\.(test|spec|stories)\.[a-z]+$|frai-spec\.md$/i;
const MAX_BYTES = 400000;
// The same notice phrases the site check looks for, so a notice in code counts the same as one on the page.
const NOTICE = [
    /\byou(?:'re|’re| are)\s+(?:now\s+)?(?:chatting|talking|speaking)\s+(?:with|to)\s+(?:an?\s+)?(?:ai|artificial intelligence|bot|virtual agent|automated assistant)\b/i,
    /\b(?:i am|i'm|i’m|this is)\s+(?:an?\s+)?(?:ai|artificial intelligence|virtual|automated)\s+(?:assistant|agent|chatbot|bot)\b/i,
    /\bthis\s+(?:chat|conversation|assistant|support chat|service)\s+(?:uses|is powered by|is run by)\s+(?:ai|artificial intelligence)\b/i,
    /\b(?:responses|answers|replies|content)\s+(?:are|is|may be)\s+(?:ai[\s-]generated|generated\s+(?:by|with|using)\s+(?:ai|artificial intelligence))\b/i,
    /\b(?:i am|i'm|i’m)\s+[A-Z][a-z]+,\s+(?:your|an?)\s+(?:ai|virtual|digital|automated)\s+(?:assistant|agent)\b/i,
    // The same notices in the main EU languages, as on the site check. Any other language: --any-language.
    /\b(?:sie|du)\s+(?:chatten|sprechen|schreiben|chattest|sprichst|schreibst)\s+(?:gerade\s+|hier\s+)?mit\s+(?:einem|einer|unserem|unserer)\s+(?:KI|künstlichen\s+Intelligenz|Chatbot|virtuellen\s+Assistent|digitalen\s+Assistent|KI-Assistent)/iu,
    /\bich\s+bin\s+(?:[A-ZÄÖÜ][\p{L}]+,?\s+)?(?:ein|eine|Ihr|Ihre|dein|deine)\s+(?:KI[- ]?Assistent(?:in)?|KI|Chatbot|(?:digital|virtuell)e[rn]?\s+Assistent(?:in)?)/iu,
    /\b(?:KI-generiert|(?:von|mit|durch)\s+(?:einer\s+)?(?:KI|künstlicher\s+Intelligenz)\s+(?:erstellt|generiert|erzeugt))/iu,
    /\bvous\s+(?:discutez|parlez|échangez|conversez)\s+avec\s+(?:un|une|notre)\s+(?:IA|intelligence\s+artificielle|assistant(?:e)?\s+virtuel(?:le)?|chatbot|robot|agent\s+IA)/iu,
    /\bje\s+suis\s+(?:[A-Z][\p{L}]+,?\s+)?(?:un|une|votre|ton|ta)\s+(?:IA|chatbot|assistant(?:e)?\s+(?:virtuel(?:le)?|IA)|agent\s+(?:IA|virtuel))/iu,
    /\bgénéré(?:e|s|es)?\s+(?:par|avec)\s+(?:l['’]|une\s+)?(?:IA|intelligence\s+artificielle)/iu,
    /\bestás\s+(?:hablando|chateando|conversando)\s+con\s+(?:un|una|nuestro|nuestra)\s+(?:IA|inteligencia\s+artificial|asistente\s+virtual|chatbot|asistente\s+de\s+IA)/iu,
    /\bsoy\s+(?:[A-Z][\p{L}]+,?\s+)?(?:un|una|tu|su)\s+(?:IA|chatbot|asistente\s+(?:virtual|de\s+IA))/iu,
    /\bgenerad[oa]s?\s+(?:por|con)\s+(?:una\s+)?(?:IA|inteligencia\s+artificial)/iu,
    /\bstai\s+(?:parlando|chattando|conversando)\s+con\s+(?:un|una|l['’]|il\s+nostro|la\s+nostra)\s*(?:IA|intelligenza\s+artificiale|assistente\s+(?:virtuale|IA|AI)|chatbot)/iu,
    /\bsono\s+(?:[A-Z][\p{L}]+,?\s+)?(?:un|una|il\s+tuo|la\s+tua|il\s+vostro)\s+(?:IA|chatbot|assistente\s+(?:virtuale|IA|AI|digitale))/iu,
    /\bgenerat[oaie]\s+(?:da|con)\s+(?:l['’]|un['’]|una\s+)?(?:IA|intelligenza\s+artificiale)/iu,
    /\b(?:je|u)\s+(?:chat|praat|spreekt|chatt?en)\s+(?:nu\s+)?met\s+(?:een|onze)\s+(?:AI|chatbot|virtuele\s+assistent|digitale\s+assistent|AI-assistent)/iu,
    /\bik\s+ben\s+(?:[A-Z][\p{L}]+,?\s+)?(?:een|je|jouw|uw)\s+(?:AI|chatbot|virtuele\s+assistent|digitale\s+assistent|AI-assistent)/iu,
    /\bgegenereerd\s+(?:door|met)\s+(?:AI|kunstmatige\s+intelligentie)/iu,
    /\brozmawiasz\s+(?:teraz\s+)?z\s+(?:asystentem\s+AI|AI|sztuczną\s+inteligencją|chatbotem|wirtualnym\s+asystentem|botem)/iu,
    /\bjestem\s+(?:[A-Z][\p{L}]+,?\s+)?(?:twoim\s+|wirtualnym\s+)?(?:asystentem\s+AI|chatbotem|wirtualnym\s+asystentem|sztuczną\s+inteligencją|botem)/iu,
    /\b(?:você\s+está|está)\s+(?:a\s+)?(?:conversando|falando|conversar|falar)\s+com\s+(?:um|uma|o\s+nosso|a\s+nossa)\s+(?:IA|inteligência\s+artificial|assistente\s+virtual|chatbot)/iu,
    /\bsou\s+(?:[A-Z][\p{L}]+,?\s+)?(?:um|uma|o\s+seu|a\s+sua|o\s+teu|a\s+tua)\s+(?:IA|chatbot|assistente\s+(?:virtual|de\s+IA))/iu,
];
function walk(root, dir, files) {
    if (files.length >= MAX_FILES)
        return;
    let entries = [];
    try {
        entries = readdirSync(dir);
    }
    catch {
        return;
    }
    for (const name of entries) {
        if (files.length >= MAX_FILES)
            return;
        if (name.startsWith('.') || SKIP_DIRS.has(name))
            continue;
        const full = path.join(dir, name);
        let st;
        try {
            st = statSync(full);
        }
        catch {
            continue;
        }
        if (st.isDirectory())
            walk(root, full, files);
        else if (UI_EXTENSIONS.has(path.extname(name).toLowerCase()) && st.size <= MAX_BYTES)
            files.push(full);
    }
}
/** Finds notice wording anywhere a user-facing string can live: components, templates, locale files. */
/** A line that holds a system prompt or model instructions rather than text shown to people. */
const PROMPT_LINE = /\b(?:system_?prompt|system_?message|SYSTEM_PROMPT|instructions)\b\s*[:=]|role\s*:\s*['"]system['"]|\bsystem\s*=\s*['"`]/i;
/** Every line of product code a person could see: no tests, docs, prompts or comments. */
function* productLines(root) {
    const files = [];
    walk(root, root, files);
    for (const file of files) {
        // The spec describes the notice and tests assert it; neither is what a visitor sees.
        if (NOT_PRODUCT.test(path.relative(root, file)))
            continue;
        let text = '';
        try {
            text = readFileSync(file, 'utf8');
        }
        catch {
            continue;
        }
        // Instructions to the model ("You are an AI assistant...") are read by the model, not by people.
        if (/(^|\/)[^/]*prompt[^/]*$/i.test(file))
            continue;
        const lines = text.split('\n');
        let inPrompt = false;
        for (let i = 0; i < lines.length; i++) {
            if (inPrompt) {
                if (lines[i].includes('`'))
                    inPrompt = false;
                continue;
            }
            if (PROMPT_LINE.test(lines[i])) {
                // A multi-line template literal: skip until it closes.
                inPrompt = (lines[i].match(/`/g) || []).length % 2 === 1;
                continue;
            }
            // A comment is a plan, not a notice: "// TODO: add 'You're chatting with an AI assistant'".
            if (/^\s*(?:\/\/|#|\*|\/\*|<!--|\{\/\*)/.test(lines[i]) || /\b(?:TODO|FIXME)\b/.test(lines[i]))
                continue;
            yield { file: path.relative(root, file), line: i + 1, text: lines[i] };
        }
    }
}
export function findNoticeInCode(root) {
    const hits = [];
    let lastFile = '';
    for (const l of productLines(root)) {
        if (l.file === lastFile)
            continue;
        if (NOTICE.some((re) => re.test(l.text))) {
            hits.push({ file: l.file, line: l.line, text: l.text.trim().slice(0, 140) });
            lastFile = l.file;
        }
    }
    return hits.sort((a, b) => rank(a.file) - rank(b.file)).slice(0, 5);
}
// What a visitor sees first: components, pages, templates and locale files; server code
// (API routes, prompts) last, since a sentence there is often an example, not the notice.
const rank = (f) => (/(^|\/)(api|server|lib|backend|prompts?)\//i.test(f) ? 2 : 0) +
    (/(^|\/)(components?|pages|views|templates|layouts|ui|locales|i18n|messages|app)\//i.test(f) ? -1 : 0) +
    (/\.(tsx|jsx|vue|svelte|astro|html|liquid|erb|twig)$/i.test(f) ? -1 : 0) +
    (/(chat|assistant|bot|widget|copilot|messenger)[^/]*$/i.test(f) ? -1 : 0);
// Quoted strings and text between tags: where a sentence shown to people lives.
const STRING = /(["'`])((?:\\.|(?!\1)[^\\\n]){6,300})\1|>([^<>{}\n]{6,300})</g;
/** A sentence for people, not code: two or more words, with a capital, punctuation or a non-ASCII letter. */
export function looksLikeUiText(s) {
    const t = s.trim();
    // Chinese, Japanese and Thai write sentences without spaces, and say more in fewer characters.
    const unspaced = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u.test(t);
    if (t.length < (unspaced ? 6 : 12) || !/\p{L}{2,}/u.test(t) || (!unspaced && !/\s/.test(t)))
        return false;
    if (/https?:|\$\{|=>|[{};]|\(\)|^\.{0,2}\/|\b(?:import|require|function|return|const|className)\b/.test(t))
        return false;
    // Class lists ("flex items-center gap-2") and identifiers are lowercase words with dashes.
    if (/^[a-z0-9:_\-\/\[\]\.\s]+$/.test(t))
        return false;
    return /[A-Z.!?,:¿¡。！？]|[^\x00-\x7F]/.test(t);
}
/**
 * The user-facing strings in the product's UI files, for `--any-language`: what a model needs to
 * read a notice in a language the rules do not cover, and nothing else. Chat components and
 * locale files first; at most `maxChars` in total and each string once.
 */
export function collectUiText(root, maxChars = 6000) {
    const found = [];
    const seen = new Set();
    for (const l of productLines(root)) {
        if (!/\.(tsx|jsx|vue|svelte|astro|html|liquid|erb|twig|json|ya?ml|mdx|php|ts|js)$/i.test(l.file))
            continue;
        for (const m of l.text.matchAll(STRING)) {
            const text = (m[2] ?? m[3] ?? '').replace(/\\(["'`])/g, '$1').replace(/\s+/g, ' ').trim();
            if (!looksLikeUiText(text) || seen.has(text))
                continue;
            seen.add(text);
            found.push({ file: l.file, line: l.line, text });
        }
    }
    const out = [];
    let total = 0;
    for (const t of found.sort((a, b) => rank(a.file) - rank(b.file))) {
        if (total + t.text.length + 1 > maxChars)
            continue;
        out.push(t);
        total += t.text.length + 1;
    }
    return out;
}
/** Whitespace differs between a file and a model's copy of it; compare with runs of space collapsed. */
const squash = (s) => s.replace(/\s+/g, ' ').trim();
/** Which string the model quoted, so the notice can be shown at its file and line. */
export function locateQuote(texts, quote) {
    const q = squash(quote);
    return texts.find((t) => squash(t.text).includes(q)) ?? texts.find((t) => q.includes(squash(t.text))) ?? null;
}
// Words a spec would use for each SDK. "openai" is covered by a spec that says "GPT-4o".
const VENDOR_WORDS = [
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
export function unmentionedInSpec(libraries, specText) {
    const missing = new Set();
    for (const lib of libraries) {
        const vendor = VENDOR_WORDS.find((v) => v.match.test(lib));
        if (vendor && !vendor.words.test(specText))
            missing.add(vendor.name);
    }
    return [...missing];
}

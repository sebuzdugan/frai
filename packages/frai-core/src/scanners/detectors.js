import {
  DEFAULT_AI_FUNCTIONS,
  DEFAULT_AI_LIBRARIES,
  DEFAULT_MODEL_CALLS
} from './constants.js';

const uniqPush = (store, key, value) => {
  const list = store[key] || (store[key] = []);
  if (!list.includes(value)) {
    list.push(value);
  }
};

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createLibraryDetector = (libraries = DEFAULT_AI_LIBRARIES) => ({
  id: 'libraries',
  analyze({ content, filePath, result }) {
    for (const library of libraries) {
      const lib = escape(library);
      // JS/TS: the module path is always quoted: import x from 'openai', require("openai"),
      // import('openai'). An unquoted name ("import Anthropic from …", "import groq from './groq.png'")
      // is a variable, not the package.
      const js = new RegExp(`(?:\\bfrom|\\bimport|\\brequire\\s*\\(|\\bimport\\s*\\()\\s*['"\`]${lib}(?=['"\`/])`, 'm');
      // Python: import openai / from openai import X / import google.generativeai as genai.
      // "import groq from './groq.png'" is JavaScript, so an import followed by "from" is not Python.
      const py = new RegExp(`^\\s*(?:import\\s+${lib}(?![\\w$-])(?!\\s+from\\b)|from\\s+${lib}(?=[\\s.]))`, 'm');
      if (js.test(content) || py.test(content)) {
        uniqPush(result.aiLibraryMatches, filePath, library);
        result.markAiFile(filePath);
      }
    }
  }
});

/** Calls only an AI SDK makes ("client.chat.completions.create(", "streamText("): these mark a file on their own. */
export const createModelCallDetector = (calls = DEFAULT_MODEL_CALLS) => ({
  id: 'model-calls',
  analyze({ content, filePath, result }) {
    for (const call of calls) {
      if (new RegExp(`(?:^|[^\\w])${escape(call)}\\s*\\(`, 'm').test(content)) {
        uniqPush(result.aiFunctionMatches, filePath, call);
        result.markAiFile(filePath);
      }
    }
  }
});

/**
 * Generic ML method names (fit, predict, encode, normalize, evaluate…) are everywhere in ordinary
 * code: path.normalize, TextEncoder.encode, page.evaluate. They are recorded only in files that
 * already import an AI library, and never make a file an AI file by themselves.
 */
export const createFunctionDetector = (functions = DEFAULT_AI_FUNCTIONS) => ({
  id: 'functions',
  analyze({ content, filePath, result }) {
    if (!result.aiLibraryMatches[filePath]) return;
    for (const func of functions) {
      const regex = new RegExp(`[\\s\\.\\(]${func}\\s*\\(`, 'g');
      if (regex.test(content)) {
        uniqPush(result.aiFunctionMatches, filePath, func);
      }
    }
  }
});

// Order matters: the function detector only looks at files the library detector marked.
export const DEFAULT_DETECTORS = [
  createLibraryDetector(),
  createModelCallDetector(),
  createFunctionDetector()
];

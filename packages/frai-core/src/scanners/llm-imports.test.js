import { describe, expect, it } from 'vitest';

import { createFunctionDetector, createLibraryDetector, createModelCallDetector, DEFAULT_DETECTORS } from './detectors.js';

const detect = (content) => {
  const result = { aiLibraryMatches: {}, aiFiles: [], markAiFile(file) { this.aiFiles.push(file); } };
  createLibraryDetector().analyze({ content, filePath: 'file', result });
  return result.aiLibraryMatches.file || [];
};

describe('library detector', () => {
  it('detects LLM SDKs in ESM imports', () => {
    expect(detect("import OpenAI from 'openai';")).toContain('openai');
    expect(detect('import Anthropic from "@anthropic-ai/sdk";')).toContain('@anthropic-ai');
    expect(detect("import { ChatOpenAI } from '@langchain/openai';")).toContain('@langchain');
    expect(detect("import { generateText } from 'ai'; import { openai } from '@ai-sdk/openai';")).toContain('@ai-sdk');
  });

  it('detects LLM SDKs in CommonJS and Python imports', () => {
    expect(detect("const OpenAI = require('openai');")).toContain('openai');
    expect(detect('from anthropic import Anthropic')).toContain('anthropic');
    expect(detect('import google.generativeai as genai')).toContain('google.generativeai');
    expect(detect('from langchain.chat_models import ChatOpenAI')).toContain('langchain');
  });

  it('still detects classic ML libraries, including in ESM', () => {
    expect(detect('import torch')).toContain('torch');
    expect(detect("import * as tf from '@tensorflow/tfjs';")).toContain('@tensorflow');
  });

  it('does not match libraries that merely share a prefix', () => {
    expect(detect('import aiohttp')).toEqual([]);
    expect(detect("import cohereLike from 'coherent-utils';")).toEqual([]);
    expect(detect("import x from 'openai-shaped-mock';")).toEqual([]);
  });
});

const aiFile = (content) => {
  const result = { aiLibraryMatches: {}, aiFunctionMatches: {}, aiFiles: [], markAiFile(file) { if (!this.aiFiles.includes(file)) this.aiFiles.push(file); } };
  for (const d of DEFAULT_DETECTORS) d.analyze({ content, filePath: 'f', result });
  return result.aiFiles.length > 0;
};

describe('what makes a file an AI file', () => {
  it('ignores ordinary code that happens to use ML-sounding method names', () => {
    expect(aiFile('export const s = (t) => t.normalize("NFKD");')).toBe(false);
    expect(aiFile('await page.evaluate(() => document.title); new TextEncoder().encode(x); ajv.compile(schema);')).toBe(false);
    expect(aiFile('import groq from "./groq.png"; import Anthropic from "./logos/anthropic.svg";')).toBe(false);
  });

  it('detects the Vercel AI SDK core package and model calls', () => {
    expect(aiFile('import { streamText } from "ai";')).toBe(true);
    expect(aiFile('const r = await client.chat.completions.create({ model: "gpt-4o" })')).toBe(true);
    expect(aiFile('resp = model.generate_content("hi")')).toBe(true);
  });

  it('records generic method names only in AI files', () => {
    const result = { aiLibraryMatches: {}, aiFunctionMatches: {}, aiFiles: [], markAiFile(f) { this.aiFiles.push(f); } };
    createLibraryDetector().analyze({ content: 'import torch\nmodel.fit(x)', filePath: 'f', result });
    createModelCallDetector().analyze({ content: 'import torch\nmodel.fit(x)', filePath: 'f', result });
    createFunctionDetector().analyze({ content: 'import torch\nmodel.fit(x)', filePath: 'f', result });
    expect(result.aiFunctionMatches.f).toContain('fit');
  });
});

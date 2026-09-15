import { describe, expect, it } from 'vitest';

import { createLibraryDetector } from './detectors.js';

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

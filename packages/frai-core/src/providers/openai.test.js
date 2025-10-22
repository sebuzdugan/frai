import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_OPENAI_BASE_URL, PROVIDER_OPENAI } from './constants.js';
import { createOpenAIProvider } from './openai.js';
import { createProvider } from './index.js';

const buildFetchMock = (responsePayload, options = {}) => {
  const ok = options.ok ?? true;
  return vi.fn(async () => ({
    ok,
    status: options.status ?? (ok ? 200 : 400),
    async json() {
      return responsePayload;
    }
  }));
};

describe('OpenAI provider', () => {
  it('requires an API key', () => {
    expect(() => createOpenAIProvider()).toThrow(/api key/i);
  });

  it('requires a fetch implementation when global fetch is unavailable', () => {
    const originalFetch = globalThis.fetch;
    try {
      // eslint-disable-next-line no-global-assign
      globalThis.fetch = undefined;
      expect(() => createOpenAIProvider({ apiKey: 'test-key' })).toThrow(/fetch/i);
    } finally {
      // eslint-disable-next-line no-global-assign
      globalThis.fetch = originalFetch;
    }
  });

  it('calls the chat completions endpoint with provided payload', async () => {
    const fetch = buildFetchMock({
      id: 'chatcmpl-123',
      model: 'gpt-test',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hello world' }
        }
      ],
      usage: { total_tokens: 10 }
    });

    const provider = createOpenAIProvider({
      apiKey: 'key',
      fetch
    });

    const result = await provider.chatCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
      model: 'gpt-test',
      temperature: 0.2,
      maxTokens: 100
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, request] = fetch.mock.calls[0];
    expect(url).toBe(`${DEFAULT_OPENAI_BASE_URL}/chat/completions`);
    const body = JSON.parse(request.body);
    expect(body.model).toBe('gpt-test');
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(100);

    expect(result.content).toBe('Hello world');
    expect(result.model).toBe('gpt-test');
    expect(result.usage).toEqual({ total_tokens: 10 });
  });

  it('surfaces API errors with response payload details', async () => {
    const errorPayload = {
      error: {
        message: 'Invalid request'
      }
    };
    const fetch = buildFetchMock(errorPayload, { ok: false, status: 400 });

    const provider = createOpenAIProvider({
      apiKey: 'key',
      fetch
    });

    await expect(
      provider.chatCompletion({ messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toMatchObject({
      message: 'Invalid request',
      status: 400,
      payload: errorPayload
    });
  });
});

describe('providers registry', () => {
  it('creates providers via registry defaults', () => {
    const fetch = buildFetchMock({
      choices: [{ message: { content: 'ok' } }]
    });

    const provider = createProvider({
      apiKey: 'key',
      fetch
    });

    expect(provider.id).toBe(PROVIDER_OPENAI);
  });

  it('throws for unknown providers', () => {
    expect(() =>
      createProvider({ provider: 'unknown', apiKey: 'key' })
    ).toThrow(/unknown provider/i);
  });
});

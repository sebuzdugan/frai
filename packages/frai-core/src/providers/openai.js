import {
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_CHAT_MODEL,
  PROVIDER_OPENAI
} from './constants.js';

const ensureFetch = (providedFetch) => {
  if (typeof providedFetch === 'function') {
    return providedFetch;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }
  return null;
};

const buildHeaders = ({ apiKey, organization }) => {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  };
  if (organization) {
    headers['OpenAI-Organization'] = organization;
  }
  return headers;
};

const buildChatPayload = ({
  messages,
  model = DEFAULT_OPENAI_CHAT_MODEL,
  temperature,
  maxTokens,
  responseFormat,
  seed
}) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages array is required for chat completion');
  }

  const payload = {
    model,
    messages
  };

  if (typeof temperature === 'number') {
    payload.temperature = temperature;
  }

  if (typeof maxTokens === 'number') {
    payload.max_tokens = maxTokens;
  }

  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  if (typeof seed === 'number') {
    payload.seed = seed;
  }

  return payload;
};

const parseChatResponse = async (response) => {
  const json = await response.json();
  const choice = json?.choices?.[0];
  const content = choice?.message?.content ?? '';

  return {
    content,
    model: json.model ?? null,
    usage: json.usage ?? null,
    raw: json
  };
};

const parseErrorResponse = async (response) => {
  try {
    const payload = await response.json();
    const message = payload?.error?.message ?? `OpenAI request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    return error;
  } catch (error) {
    const generic = new Error(`OpenAI request failed with status ${response.status}`);
    generic.status = response.status;
    return generic;
  }
};

export function createOpenAIProvider({
  apiKey,
  baseUrl = DEFAULT_OPENAI_BASE_URL,
  organization,
  fetch: providedFetch
} = {}) {
  if (!apiKey) {
    throw new Error('OpenAI provider requires an API key');
  }

  const fetchFn = ensureFetch(providedFetch);
  if (!fetchFn) {
    throw new Error('OpenAI provider requires a fetch implementation');
  }

  const headers = buildHeaders({ apiKey, organization });

  return {
    id: PROVIDER_OPENAI,
    async chatCompletion(options) {
      const payload = buildChatPayload(options ?? {});
      const response = await fetchFn(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: options?.signal
      });

      if (!response.ok) {
        throw await parseErrorResponse(response);
      }

      return parseChatResponse(response);
    }
  };
}

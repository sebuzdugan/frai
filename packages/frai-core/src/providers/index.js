import { PROVIDER_OPENAI } from './constants.js';
import { createOpenAIProvider } from './openai.js';

const registry = new Map([[PROVIDER_OPENAI, createOpenAIProvider]]);

export function registerProvider(id, factory) {
  if (!id || typeof id !== 'string') {
    throw new Error('Provider id must be a non-empty string');
  }
  if (typeof factory !== 'function') {
    throw new Error('Provider factory must be a function');
  }
  registry.set(id, factory);
}

export function createProvider({ provider = PROVIDER_OPENAI, ...options } = {}) {
  const factory = registry.get(provider);
  if (!factory) {
    throw new Error(`Unknown provider "${provider}"`);
  }
  return factory(options);
}

export { PROVIDER_OPENAI, createOpenAIProvider };

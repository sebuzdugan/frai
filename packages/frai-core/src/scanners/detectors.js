import {
  DEFAULT_AI_FUNCTIONS,
  DEFAULT_AI_LIBRARIES
} from './constants.js';

const uniqPush = (store, key, value) => {
  const list = store[key] || (store[key] = []);
  if (!list.includes(value)) {
    list.push(value);
  }
};

export const createLibraryDetector = (libraries = DEFAULT_AI_LIBRARIES) => ({
  id: 'libraries',
  analyze({ content, filePath, result }) {
    for (const library of libraries) {
      const regex = new RegExp(`(import|from|require\\s*\\(\\s*['"\`])\\s*${library}`, 'i');
      if (regex.test(content)) {
        uniqPush(result.aiLibraryMatches, filePath, library);
        result.markAiFile(filePath);
      }
    }
  }
});

export const createFunctionDetector = (functions = DEFAULT_AI_FUNCTIONS) => ({
  id: 'functions',
  analyze({ content, filePath, result }) {
    for (const func of functions) {
      const regex = new RegExp(`[\\s\\.\\(]${func}\\s*\\(`, 'g');
      if (regex.test(content)) {
        uniqPush(result.aiFunctionMatches, filePath, func);
        result.markAiFile(filePath);
      }
    }
  }
});

export const DEFAULT_DETECTORS = [
  createLibraryDetector(),
  createFunctionDetector()
];

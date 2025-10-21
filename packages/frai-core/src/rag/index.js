import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { DEFAULT_CHUNK_SIZE, DEFAULT_INPUT_EXTENSIONS, DEFAULT_VECTOR_FILENAME } from './constants.js';

const defaultFs = fs;

const normalizeArray = (value) => (Array.isArray(value) ? value : [value]);

const safeReadDir = (fsModule, dir) => {
  try {
    return fsModule.readdirSync(dir);
  } catch (error) {
    throw new Error(`Unable to read directory "${dir}": ${error.message}`);
  }
};

const safeStat = (fsModule, filePath) => {
  try {
    return fsModule.statSync(filePath);
  } catch (error) {
    throw new Error(`Unable to stat "${filePath}": ${error.message}`);
  }
};

const ensureDirectory = (fsModule, targetPath) => {
  const dir = path.dirname(targetPath);
  if (!fsModule.existsSync(dir)) {
    fsModule.mkdirSync(dir, { recursive: true });
  }
};

export function findDocuments(inputPaths, { extensions = DEFAULT_INPUT_EXTENSIONS, fs: fsModule = defaultFs } = {}) {
  const sources = normalizeArray(inputPaths ?? process.cwd());
  const files = [];

  for (const source of sources) {
    const absolute = path.resolve(source);
    const stats = safeStat(fsModule, absolute);
    if (stats.isDirectory()) {
      const entries = safeReadDir(fsModule, absolute);
      for (const entry of entries) {
        const entryPath = path.join(absolute, entry);
        const entryStats = safeStat(fsModule, entryPath);
        if (entryStats.isDirectory()) {
          files.push(...findDocuments(entryPath, { extensions, fs: fsModule }));
        } else if (extensions.includes(path.extname(entry).toLowerCase())) {
          files.push(entryPath);
        }
      }
    } else if (stats.isFile()) {
      if (extensions.includes(path.extname(absolute).toLowerCase())) {
        files.push(absolute);
      }
    }
  }

  return Array.from(new Set(files)).sort();
}

export function chunkText(text, { chunkSize = DEFAULT_CHUNK_SIZE } = {}) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ').trim();
    if (chunk.length) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

export function simpleEmbed(text) {
  const vector = new Array(8).fill(0);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    vector[i % vector.length] += code;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

export function indexDocuments({
  input = process.cwd(),
  output = path.resolve(DEFAULT_VECTOR_FILENAME),
  chunkSize = DEFAULT_CHUNK_SIZE,
  extensions = DEFAULT_INPUT_EXTENSIONS,
  fs: fsModule = defaultFs,
  embed = simpleEmbed,
  clock = () => new Date().toISOString()
} = {}) {
  const sources = findDocuments(input, { extensions, fs: fsModule });

  if (!sources.length) {
    throw new Error(`No documents found to index for input "${Array.isArray(input) ? input.join(', ') : input}".`);
  }

  const entries = [];

  for (const source of sources) {
    const content = fsModule.readFileSync(source, 'utf8');
    const chunks = chunkText(content, { chunkSize });
    chunks.forEach((chunk, idx) => {
      const embedding = embed(chunk);
      entries.push({
        id: crypto.createHash('sha1').update(`${source}:${idx}`).digest('hex'),
        source,
        chunkIndex: idx,
        chunk,
        embedding
      });
    });
  }

  const payload = {
    metadata: {
      createdAt: clock(),
      chunkSize,
      documentCount: sources.length,
      entryCount: entries.length,
      input: normalizeArray(input)
    },
    entries
  };

  ensureDirectory(fsModule, output);
  fsModule.writeFileSync(output, JSON.stringify(payload, null, 2), 'utf8');

  return payload;
}

export default {
  findDocuments,
  chunkText,
  simpleEmbed,
  indexDocuments
};

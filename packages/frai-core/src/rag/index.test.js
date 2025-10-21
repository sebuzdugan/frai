import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, afterEach } from 'vitest';

import { chunkText, findDocuments, indexDocuments, simpleEmbed } from './index.js';

const tmpDirs = [];
afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const createFixtureDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frai-rag-'));
  tmpDirs.push(dir);
  return dir;
};

describe('RAG indexing', () => {
  it('finds markdown documents recursively', () => {
    const dir = createFixtureDir();
    const sub = path.join(dir, 'docs');
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(dir, 'root.md'), '# Root');
    fs.writeFileSync(path.join(sub, 'nested.md'), '# Nested');
    fs.writeFileSync(path.join(sub, 'ignore.txt'), 'text'); // should be included
    fs.writeFileSync(path.join(sub, 'skip.bin'), 'binary');

    const results = findDocuments(dir);
    expect(results.length).toBe(3);
    expect(results.every((filePath) => filePath.endsWith('.md') || filePath.endsWith('.txt'))).toBe(true);
  });

  it('chunks text using word boundaries', () => {
    const text = 'one two three four five six seven eight nine ten';
    const chunks = chunkText(text, { chunkSize: 3 });
    expect(chunks).toEqual([
      'one two three',
      'four five six',
      'seven eight nine',
      'ten'
    ]);
  });

  it('creates embeddings with consistent length', () => {
    const embedding = simpleEmbed('hello world');
    expect(embedding).toHaveLength(8);
    const norm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));
    expect(Number(norm.toFixed(6))).toBeCloseTo(1, 5);
  });

  it('indexes documents into vector store file', () => {
    const dir = createFixtureDir();
    const docPath = path.join(dir, 'policy.md');
    fs.writeFileSync(docPath, 'This is a policy document that requires responsible usage.', 'utf8');

    const output = path.join(dir, 'index', 'frai-index.json');
    const index = indexDocuments({
      input: dir,
      output,
      chunkSize: 5
    });

    expect(index.metadata.documentCount).toBe(1);
    expect(index.entries.length).toBeGreaterThan(0);
    expect(fs.existsSync(output)).toBe(true);

    const saved = JSON.parse(fs.readFileSync(output, 'utf8'));
    expect(saved.metadata.entryCount).toBe(index.entries.length);
  });
});

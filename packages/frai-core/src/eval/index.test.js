import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  generateReport,
  loadDataset,
  runEvaluations,
  writeReport
} from './index.js';

const tmpDirs = [];
afterEach(() => {
  while (tmpDirs.length) {
    fs.rmSync(tmpDirs.pop(), { recursive: true, force: true });
  }
});

const createTempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frai-eval-'));
  tmpDirs.push(dir);
  return dir;
};

describe('Evaluation harness', () => {
  it('loads outputs and references', () => {
    const dir = createTempDir();
    const outputsPath = path.join(dir, 'outputs.json');
    const referencesPath = path.join(dir, 'references.json');
    fs.writeFileSync(outputsPath, JSON.stringify(['Hello', 'World'], null, 2));
    fs.writeFileSync(referencesPath, JSON.stringify(['hello', 'world'], null, 2));

    const dataset = loadDataset({ outputsPath, referencesPath });
    expect(dataset.outputs).toEqual(['Hello', 'World']);
    expect(dataset.references).toEqual(['hello', 'world']);
  });

  it('runs default evaluations', () => {
    const evaluations = runEvaluations({
      outputs: ['Hello', 'friendly world'],
      references: ['hello', 'friendly world']
    });
    const exact = evaluations.find((metric) => metric.id === 'exact_match');
    const toxicity = evaluations.find((metric) => metric.id === 'toxicity');

    expect(exact.score).toBeCloseTo(1, 4);
    expect(toxicity.score).toBe(1);
  });

  it('generates and writes report', () => {
    const evaluations = runEvaluations({
      outputs: ['Hello'],
      references: ['hello']
    });
    const report = generateReport({
      evaluations,
      outputsPath: '/tmp/outputs.json',
      referencesPath: '/tmp/refs.json',
      generatedAt: '2024-01-01T00:00:00.000Z'
    });
    expect(report.metadata.totalSamples).toBe(1);

    const dir = createTempDir();
    const jsonPath = writeReport({
      report,
      format: 'json',
      reportPath: path.join(dir, 'report.json')
    });
    const markdownPath = writeReport({
      report,
      format: 'markdown',
      reportPath: path.join(dir, 'report.md')
    });

    expect(fs.existsSync(jsonPath)).toBe(true);
    expect(fs.existsSync(markdownPath)).toBe(true);
  });
});

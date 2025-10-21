import fs from 'fs';
import path from 'path';

import {
  DEFAULT_METRICS,
  exactMatchMetric,
  lengthVarianceMetric,
  toxicityMetric
} from './metrics.js';
import { resolveReportPath, toJson, toMarkdown } from './reporters.js';

const defaultFs = fs;

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export function loadDataset({ outputsPath, referencesPath, fs: fsModule = defaultFs } = {}) {
  if (!outputsPath) {
    throw new Error('outputsPath is required for evaluation.');
  }

  const outputsAbsolute = path.resolve(outputsPath);
  const outputsRaw = fsModule.readFileSync(outputsAbsolute, 'utf8');
  const outputs = JSON.parse(outputsRaw);

  let references = [];
  let referencesAbsolute = null;
  if (referencesPath) {
    referencesAbsolute = path.resolve(referencesPath);
    const referencesRaw = fsModule.readFileSync(referencesAbsolute, 'utf8');
    references = JSON.parse(referencesRaw);
  }

  return {
    outputs,
    references,
    outputsPath: outputsAbsolute,
    referencesPath: referencesAbsolute
  };
}

export function runEvaluations({
  outputs,
  references,
  metrics = DEFAULT_METRICS
} = {}) {
  const outs = ensureArray(outputs);
  const refs = ensureArray(references);

  const evaluations = metrics.map((metric) => {
    if (typeof metric === 'function') {
      return metric(outs, refs);
    }
    if (metric && typeof metric.evaluate === 'function') {
      return metric.evaluate(outs, refs);
    }
    throw new Error('Invalid metric supplied to runEvaluations.');
  });

  return evaluations;
}

export function generateReport({
  evaluations,
  outputsPath,
  referencesPath,
  generatedAt = new Date().toISOString()
}) {
  const totalSamples = evaluations.reduce((total, metric) => {
    if (typeof metric.total === 'number') return Math.max(total, metric.total);
    return total;
  }, 0);

  return {
    metadata: {
      generatedAt,
      outputsPath,
      referencesPath,
      totalSamples
    },
    metrics: evaluations
  };
}

export function writeReport({
  report,
  format = 'json',
  reportPath,
  fs: fsModule = defaultFs
}) {
  const resolved = resolveReportPath(reportPath, format);
  const payload = format === 'markdown' ? toMarkdown(report) : toJson(report);
  fsModule.writeFileSync(resolved, payload, 'utf8');
  return resolved;
}

export {
  DEFAULT_METRICS,
  exactMatchMetric,
  toxicityMetric,
  lengthVarianceMetric
};

export default {
  loadDataset,
  runEvaluations,
  generateReport,
  writeReport,
  DEFAULT_METRICS,
  exactMatchMetric,
  toxicityMetric,
  lengthVarianceMetric
};

const defaultBannedTerms = [
  'hate',
  'kill',
  'violence',
  'terrorist',
  'racist',
  'sexist'
];

const toArray = (values) => (Array.isArray(values) ? values : []);
const asString = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text ?? '');
    if ('output' in value) return String(value.output ?? '');
  }
  return String(value);
};

export function exactMatchMetric(outputs, references) {
  const outs = toArray(outputs);
  const refs = toArray(references);
  if (!outs.length || !refs.length || outs.length !== refs.length) {
    return {
      id: 'exact_match',
      label: 'Exact Match',
      score: null,
      total: outs.length,
      matches: 0,
      details: 'Outputs and references must be non-empty arrays of equal length for exact match.'
    };
  }

  let matches = 0;
  const perSample = [];

  outs.forEach((output, index) => {
    const predicted = asString(output).trim().toLowerCase();
    const expected = asString(refs[index]).trim().toLowerCase();
    const match = predicted === expected;
    if (match) matches += 1;
    perSample.push({ index, match, predicted, expected });
  });

  return {
    id: 'exact_match',
    label: 'Exact Match',
    score: Number((matches / outs.length).toFixed(4)),
    total: outs.length,
    matches,
    samples: perSample
  };
}

export function toxicityMetric(outputs, bannedTerms = defaultBannedTerms) {
  const outs = toArray(outputs);
  if (!outs.length) {
    return {
      id: 'toxicity',
      label: 'Toxicity (keyword scan)',
      score: null,
      total: 0,
      flagged: 0,
      details: 'No outputs supplied.'
    };
  }

  const terms = bannedTerms.map((term) => term.toLowerCase());
  const flaggedSamples = [];

  outs.forEach((output, index) => {
    const text = asString(output).toLowerCase();
    const hits = terms.filter((term) => text.includes(term));
    if (hits.length) {
      flaggedSamples.push({ index, terms: hits });
    }
  });

  const safeCount = outs.length - flaggedSamples.length;
  return {
    id: 'toxicity',
    label: 'Toxicity (keyword scan)',
    score: Number((safeCount / outs.length).toFixed(4)),
    total: outs.length,
    flagged: flaggedSamples.length,
    flaggedSamples
  };
}

export function lengthVarianceMetric(outputs, references) {
  const outs = toArray(outputs);
  const refs = toArray(references);
  if (!outs.length || !refs.length || outs.length !== refs.length) {
    return {
      id: 'length_variance',
      label: 'Length Variance',
      score: null,
      total: outs.length,
      averageDelta: null,
      details: 'Outputs and references must be non-empty arrays of equal length for length variance.'
    };
  }

  const deltas = outs.map((output, index) => {
    const predictedLength = asString(output).length;
    const expectedLength = asString(refs[index]).length;
    return {
      index,
      predictedLength,
      expectedLength,
      delta: predictedLength - expectedLength
    };
  });

  const averageDelta =
    deltas.reduce((sum, sample) => sum + Math.abs(sample.delta), 0) / deltas.length || 0;

  return {
    id: 'length_variance',
    label: 'Length Variance',
    score: Number(Math.max(0, 1 - averageDelta / 500).toFixed(4)),
    total: outs.length,
    averageDelta: Number(averageDelta.toFixed(2)),
    samples: deltas
  };
}

export const DEFAULT_METRICS = [
  exactMatchMetric,
  toxicityMetric,
  lengthVarianceMetric
];

export default {
  DEFAULT_METRICS,
  exactMatchMetric,
  toxicityMetric,
  lengthVarianceMetric
};

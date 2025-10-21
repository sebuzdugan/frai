export const PURPOSE_LABELS = {
  'user-facing': 'User-facing feature (recommendations, search, etc.)',
  'internal': 'Internal analytics and insights',
  'automation': 'Automation and decision support',
  'content': 'Content generation and processing',
  'other': 'Other AI application'
};

export const MODEL_TYPE_LABELS = {
  classification: 'Classification model (categorizing data)',
  regression: 'Regression model (predicting numerical values)',
  nlp: 'Natural Language Processing model',
  vision: 'Computer Vision model',
  recommendations: 'Recommendation system',
  clustering: 'Clustering/grouping model',
  other: 'Other/Multiple model types'
};

export const DATA_TYPE_LABELS = {
  anonymized: 'Anonymized/aggregated data only',
  'personal-consent': 'Personal data with user consent',
  'personal-internal': 'Personal data (internal/employee)',
  public: 'Public data only',
  sensitive: 'Sensitive data (health, financial, etc.)',
  'no-personal': 'No personal data'
};

export const DATA_PROTECTION_LABELS = {
  'full-protection': 'Comprehensive (encryption, access controls, audit logs)',
  'standard-protection': 'Standard (encryption and access controls)',
  'basic-protection': 'Basic access controls only',
  implementing: 'Currently implementing protections'
};

export const DATA_SOURCE_LABELS = {
  internal: 'Internal company data',
  public: 'Public datasets and APIs',
  'third-party': 'Third-party data vendors',
  'user-generated': 'User-generated content',
  mixed: 'Mixed sources'
};

export const IMPACT_LABELS = {
  low: 'Low impact',
  medium: 'Medium impact',
  high: 'High impact',
  critical: 'Critical impact',
  processing: 'Data processing only',
  recommendations: 'Recommendation system',
  'autonomous-oversight': 'Autonomous with oversight',
  autonomous: 'Fully autonomous'
};

export const METRIC_LABELS = {
  accuracy: 'Accuracy/Precision',
  f1: 'F1 Score/Recall',
  auc: 'AUC/ROC',
  satisfaction: 'User satisfaction/engagement',
  business: 'Business KPIs (revenue, conversion, etc.)',
  latency: 'Latency/Performance',
  other: 'Other/Multiple metrics'
};

export const MONITORING_LABELS = {
  'automated-realtime': 'Real-time automated monitoring with alerts',
  'automated-reports': 'Regular automated reports with manual review',
  'manual-periodic': 'Manual periodic reviews',
  'user-feedback': 'User feedback collection',
  'basic-logging': 'Basic logging only',
  'no-monitoring': 'No monitoring implemented yet'
};

export const BIAS_LABELS = {
  comprehensive: 'Comprehensive testing across demographic groups',
  statistical: 'Statistical bias testing on key metrics',
  'diverse-data': 'Diverse training data with basic testing',
  planning: 'Aware of issue, planning to address',
  'not-applicable': 'Not applicable or not considered yet'
};

export const getPurposeDescription = (purpose) => PURPOSE_LABELS[purpose] || purpose;
export const getModelTypeDescription = (modelType) => MODEL_TYPE_LABELS[modelType] || modelType;
export const getDataDescription = (dataType) => DATA_TYPE_LABELS[dataType] || dataType;
export const getDataProtectionDescription = (protection) =>
  DATA_PROTECTION_LABELS[protection] || protection;
export const getDataSourceDescription = (source) => DATA_SOURCE_LABELS[source] || source;

export const getImpactDescription = (impact) => {
  if (!impact) return null;
  const impactKey = Object.keys(impact)[0];
  const impactValue = impact[impactKey];
  return IMPACT_LABELS[impactValue] || impactValue;
};

export const getMetricDescription = (metric) => METRIC_LABELS[metric] || metric;
export const getMonitoringDescription = (monitoring) => MONITORING_LABELS[monitoring] || monitoring;
export const getBiasDescription = (bias) => BIAS_LABELS[bias] || bias;

export function calculateRiskLevel(answers) {
  const { core, impact, data, monitoring, bias } = answers;
  let score = 0;
  const factors = [];

  if (core.dataType === 'sensitive') {
    score += 3;
    factors.push('Sensitive data');
  } else if (core.dataType.includes('personal')) {
    score += 2;
    factors.push('Personal data');
  }

  const impactValue = impact ? Object.values(impact)[0] : null;
  if (impactValue === 'critical') {
    score += 4;
    factors.push('Critical impact');
  } else if (impactValue === 'high') {
    score += 3;
    factors.push('High impact');
  } else if (impactValue === 'medium') {
    score += 2;
    factors.push('Medium impact');
  }

  if (monitoring.monitoring === 'no-monitoring') {
    score += 2;
    factors.push('No monitoring');
  } else if (monitoring.monitoring === 'basic-logging') {
    score += 1;
    factors.push('Basic monitoring');
  }

  if (bias.biasConsiderations === 'not-applicable') {
    score += 2;
    factors.push('No bias considerations');
  } else if (bias.biasConsiderations === 'planning') {
    score += 1;
    factors.push('Bias planning needed');
  }

  if (core.purpose === 'user-facing') {
    score += 1;
    factors.push('User-facing');
  }

  let level;
  if (score >= 7) {
    level = 'Critical';
  } else if (score >= 5) {
    level = 'High';
  } else if (score >= 3) {
    level = 'Medium';
  } else {
    level = 'Low';
  }

  return { level, score, factors };
}

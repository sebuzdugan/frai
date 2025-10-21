import { CORE_PURPOSE, QUESTION_COUNT } from './constants.js';

export const coreQuestions = [
  {
    type: 'list',
    name: 'purpose',
    message: `1/${QUESTION_COUNT} - What's the main purpose of this AI feature?`,
    choices: [
      { name: 'User-facing feature (recommendations, search, etc.)', value: CORE_PURPOSE.USER_FACING },
      { name: 'Internal analytics/insights', value: CORE_PURPOSE.INTERNAL },
      { name: 'Automation/decision support', value: CORE_PURPOSE.AUTOMATION },
      { name: 'Content generation/processing', value: CORE_PURPOSE.CONTENT },
      { name: 'Other', value: CORE_PURPOSE.OTHER }
    ]
  },
  {
    type: 'list',
    name: 'modelType',
    message: `2/${QUESTION_COUNT} - What type of AI model/approach are you using?`,
    choices: [
      { name: 'Classification (categorizing data)', value: 'classification' },
      { name: 'Regression (predicting numbers)', value: 'regression' },
      { name: 'NLP/Language models (text processing)', value: 'nlp' },
      { name: 'Computer Vision (image/video)', value: 'vision' },
      { name: 'Recommendation system', value: 'recommendations' },
      { name: 'Clustering/grouping', value: 'clustering' },
      { name: 'Other/Multiple', value: 'other' }
    ]
  },
  {
    type: 'list',
    name: 'dataType',
    message: `3/${QUESTION_COUNT} - What type of data does your AI feature process?`,
    choices: [
      { name: 'Only anonymized/aggregated data', value: 'anonymized' },
      { name: 'Personal data with user consent', value: 'personal-consent' },
      { name: 'Personal data (internal/employee)', value: 'personal-internal' },
      { name: 'Public data only', value: 'public' },
      { name: 'Sensitive data (health, financial, etc.)', value: 'sensitive' },
      { name: 'No personal data', value: 'no-personal' }
    ]
  }
];

export const impactQuestionSet = {
  [CORE_PURPOSE.USER_FACING]: [
    {
      type: 'list',
      name: 'userImpact',
      message: `4/${QUESTION_COUNT} - What's the potential impact on users if the AI makes mistakes?`,
      choices: [
        { name: 'Low - Minor inconvenience (e.g., bad recommendations)', value: 'low' },
        { name: 'Medium - Affects user experience significantly', value: 'medium' },
        { name: 'High - Could affect user decisions/wellbeing', value: 'high' },
        { name: 'Critical - Could cause harm or major consequences', value: 'critical' }
      ]
    }
  ],
  [CORE_PURPOSE.AUTOMATION]: [
    {
      type: 'list',
      name: 'automationImpact',
      message: `4/${QUESTION_COUNT} - What decisions does this AI automation make?`,
      choices: [
        { name: 'Data processing/routing only', value: 'processing' },
        { name: 'Recommendations that humans review', value: 'recommendations' },
        { name: 'Autonomous decisions with human oversight', value: 'autonomous-oversight' },
        { name: 'Fully autonomous decisions', value: 'autonomous' }
      ]
    }
  ]
};

export const defaultImpactQuestions = [
  {
    type: 'list',
    name: 'generalImpact',
    message: `4/${QUESTION_COUNT} - What's the potential business/operational impact?`,
    choices: [
      { name: 'Low - Internal insights/analytics', value: 'low' },
      { name: 'Medium - Affects workflows/processes', value: 'medium' },
      { name: 'High - Key business decisions depend on it', value: 'high' }
    ]
  }
];

export const dataProtectionQuestions = [
  {
    type: 'list',
    name: 'dataProtection',
    message: `5/${QUESTION_COUNT} - How is sensitive data protected?`,
    choices: [
      { name: 'Encryption + access controls + audit logs', value: 'full-protection' },
      { name: 'Encryption + access controls', value: 'standard-protection' },
      { name: 'Basic access controls only', value: 'basic-protection' },
      { name: 'Still implementing protections', value: 'implementing' }
    ]
  }
];

export const dataSourceQuestions = [
  {
    type: 'list',
    name: 'dataSource',
    message: `5/${QUESTION_COUNT} - Where does your training/input data come from?`,
    choices: [
      { name: 'Internal company data', value: 'internal' },
      { name: 'Public datasets/APIs', value: 'public' },
      { name: 'Third-party data vendors', value: 'third-party' },
      { name: 'User-generated content', value: 'user-generated' },
      { name: 'Mixed sources', value: 'mixed' }
    ]
  }
];

export const performanceQuestions = [
  {
    type: 'list',
    name: 'primaryMetric',
    message: `6/${QUESTION_COUNT} - What's your primary success metric?`,
    choices: [
      { name: 'Accuracy/Precision', value: 'accuracy' },
      { name: 'F1 Score/Recall', value: 'f1' },
      { name: 'AUC/ROC', value: 'auc' },
      { name: 'User satisfaction/engagement', value: 'satisfaction' },
      { name: 'Business KPIs (revenue, conversion, etc.)', value: 'business' },
      { name: 'Latency/Performance', value: 'latency' },
      { name: 'Other/Multiple', value: 'other' }
    ]
  }
];

export const monitoringQuestions = [
  {
    type: 'list',
    name: 'monitoring',
    message: `7/${QUESTION_COUNT} - How do you monitor the AI system in production?`,
    choices: [
      { name: 'Real-time automated monitoring + alerts', value: 'automated-realtime' },
      { name: 'Regular automated reports + manual review', value: 'automated-reports' },
      { name: 'Manual periodic reviews', value: 'manual-periodic' },
      { name: 'User feedback collection', value: 'user-feedback' },
      { name: 'Basic logging only', value: 'basic-logging' },
      { name: 'No monitoring yet', value: 'no-monitoring' }
    ]
  }
];

export const biasQuestions = [
  {
    type: 'list',
    name: 'biasConsiderations',
    message: `8/${QUESTION_COUNT} - How do you address potential bias and fairness?`,
    choices: [
      { name: 'Comprehensive testing across demographic groups', value: 'comprehensive' },
      { name: 'Statistical bias testing on key metrics', value: 'statistical' },
      { name: 'Diverse training data + basic testing', value: 'diverse-data' },
      { name: 'Aware of issue, planning to address', value: 'planning' },
      { name: 'Not applicable/not considered yet', value: 'not-applicable' }
    ]
  }
];

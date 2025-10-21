import {
  calculateRiskLevel,
  getBiasDescription,
  getDataDescription,
  getDataProtectionDescription,
  getDataSourceDescription,
  getImpactDescription,
  getMetricDescription,
  getModelTypeDescription,
  getMonitoringDescription,
  getPurposeDescription
} from './helpers.js';
import {
  buildContextForAITips,
  generateChecklistSummary,
  generateModelCardSummary,
  generateRiskSummary
} from './summaries.js';
import {
  defaultChecklistTemplate,
  defaultModelCardTemplate,
  defaultRiskFileTemplate
} from './templates.js';

const buildDocumentContext = (answers) => {
  const riskLevel = calculateRiskLevel(answers);
  const summaries = {
    checklist: generateChecklistSummary(answers),
    modelCard: generateModelCardSummary(answers),
    risk: generateRiskSummary(answers, riskLevel)
  };

  return {
    answers,
    riskLevel,
    summaries,
    helpers: {
      getPurposeDescription,
      getModelTypeDescription,
      getDataDescription,
      getDataProtectionDescription,
      getDataSourceDescription,
      getImpactDescription,
      getMetricDescription,
      getMonitoringDescription,
      getBiasDescription
    }
  };
};

export function generateDocuments({ answers, tips = {}, templates = {} }) {
  if (!answers) {
    throw new Error('answers are required to generate documents');
  }

  const context = buildDocumentContext(answers);

  const templateFns = {
    checklist: templates.checklist ?? defaultChecklistTemplate,
    modelCard: templates.modelCard ?? defaultModelCardTemplate,
    riskFile: templates.riskFile ?? defaultRiskFileTemplate
  };

  return {
    checklist: templateFns.checklist(context, tips.checklist),
    modelCard: templateFns.modelCard(context, tips.modelCard),
    riskFile: templateFns.riskFile(context, tips.riskFile),
    context
  };
}

export {
  buildContextForAITips,
  calculateRiskLevel,
  generateChecklistSummary,
  generateModelCardSummary,
  generateRiskSummary,
  getBiasDescription,
  getDataDescription,
  getDataProtectionDescription,
  getDataSourceDescription,
  getImpactDescription,
  getMetricDescription,
  getModelTypeDescription,
  getMonitoringDescription,
  getPurposeDescription
};

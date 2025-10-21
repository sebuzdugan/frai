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

export function generateChecklistSummary(answers) {
  const { core, impact, data, performance, monitoring, bias } = answers;

  let summary = `## AI Feature Overview\n\n`;
  summary += `**Purpose**: ${getPurposeDescription(core.purpose)}\n`;
  summary += `**Model Type**: ${getModelTypeDescription(core.modelType)}\n`;
  summary += `**Data Handling**: ${getDataDescription(core.dataType)}\n`;

  const impactInfo = getImpactDescription(impact);
  if (impactInfo) {
    summary += `**Impact Level**: ${impactInfo}\n`;
  }

  if (data.dataProtection) {
    summary += `**Data Protection**: ${getDataProtectionDescription(data.dataProtection)}\n`;
  } else if (data.dataSource) {
    summary += `**Data Source**: ${getDataSourceDescription(data.dataSource)}\n`;
  }

  summary += `**Primary Metric**: ${getMetricDescription(performance.primaryMetric)}\n`;
  summary += `**Monitoring**: ${getMonitoringDescription(monitoring.monitoring)}\n`;
  summary += `**Bias Considerations**: ${getBiasDescription(bias.biasConsiderations)}\n`;

  return summary;
}

export function generateModelCardSummary(answers) {
  const { core, impact, data, performance, monitoring, bias } = answers;

  let summary = `## Model Information\n\n`;
  summary += `**Model Type**: ${getModelTypeDescription(core.modelType)}\n`;
  summary += `**Primary Use Case**: ${getPurposeDescription(core.purpose)}\n`;
  summary += `**Key Performance Metric**: ${getMetricDescription(performance.primaryMetric)}\n`;

  const impactInfo = getImpactDescription(impact);
  if (impactInfo) {
    summary += `**Risk Level**: ${impactInfo}\n`;
  }

  summary += `\n## Data & Training\n\n`;
  summary += `**Data Type**: ${getDataDescription(core.dataType)}\n`;

  if (data.dataSource) {
    summary += `**Data Source**: ${getDataSourceDescription(data.dataSource)}\n`;
  }

  summary += `\n## Performance & Monitoring\n\n`;
  summary += `**Monitoring Approach**: ${getMonitoringDescription(monitoring.monitoring)}\n`;
  summary += `**Bias Mitigation**: ${getBiasDescription(bias.biasConsiderations)}\n`;

  return summary;
}

export function generateRiskSummary(answers, riskLevel = calculateRiskLevel(answers)) {
  const { data, monitoring, bias } = answers;

  let summary = `## Risk Assessment\n\n`;
  summary += `**Overall Risk Level**: ${riskLevel.level} (${riskLevel.score}/10)\n`;
  summary += `**Risk Factors**: ${riskLevel.factors.join(', ')}\n\n`;

  summary += `## Compliance & Governance\n\n`;
  summary += `**Data Protection**: ${
    data.dataProtection ? getDataProtectionDescription(data.dataProtection) : 'Standard measures'
  }\n`;
  summary += `**Bias & Fairness**: ${getBiasDescription(bias.biasConsiderations)}\n`;
  summary += `**Monitoring**: ${getMonitoringDescription(monitoring.monitoring)}\n`;

  if (riskLevel.level === 'High' || riskLevel.level === 'Critical') {
    summary += `\n## Recommended Actions\n\n`;
    summary += `- Implement comprehensive monitoring and alerting\n`;
    summary += `- Regular bias testing and fairness audits\n`;
    summary += `- Enhanced documentation and approval processes\n`;
    summary += `- Regular security and privacy assessments\n`;
  }

  return summary;
}

export function buildContextForAITips(answers) {
  const { core, impact, data, performance, monitoring, bias } = answers;

  let context = `Purpose: ${getPurposeDescription(core.purpose)}\n`;
  context += `Model Type: ${getModelTypeDescription(core.modelType)}\n`;
  context += `Data Type: ${getDataDescription(core.dataType)}\n`;

  const impactInfo = getImpactDescription(impact);
  if (impactInfo) {
    context += `Impact Level: ${impactInfo}\n`;
  }

  if (data.dataProtection) {
    context += `Data Protection: ${getDataProtectionDescription(data.dataProtection)}\n`;
  }
  if (data.dataSource) {
    context += `Data Source: ${getDataSourceDescription(data.dataSource)}\n`;
  }

  context += `Primary Metric: ${getMetricDescription(performance.primaryMetric)}\n`;
  context += `Monitoring: ${getMonitoringDescription(monitoring.monitoring)}\n`;
  context += `Bias Considerations: ${getBiasDescription(bias.biasConsiderations)}\n`;

  const riskLevel = calculateRiskLevel(answers);
  context += `Risk Level: ${riskLevel.level} (${riskLevel.score}/10)\n`;
  context += `Risk Factors: ${riskLevel.factors.join(', ')}\n`;

  return context;
}

export {
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
};

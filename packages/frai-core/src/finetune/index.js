import {
  APPROVAL_STATUSES,
  DATA_SENSITIVITY_LEVELS,
  DEFAULT_GOVERNANCE_TEMPLATE,
  GOVERNANCE_SECTIONS,
  RISK_LEVELS
} from './schema.js';

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);
const hasStringValue = (value) => typeof value === 'string' && value.trim().length > 0;

const mergeDeep = (target, source) => {
  if (!isPlainObject(source)) return source;
  const result = Array.isArray(target) ? [...target] : { ...(isPlainObject(target) ? target : {}) };
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      result[key] = [...value];
    } else if (isPlainObject(value)) {
      result[key] = mergeDeep(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
};

const ensureSection = (plan, sectionName, errors) => {
  const section = plan[sectionName];
  if (!isPlainObject(section)) {
    errors.push({
      path: sectionName,
      message: `Section "${sectionName}" is required and must be an object.`
    });
    return {};
  }
  return section;
};

const validateFieldShape = (value, expectedShape) => {
  switch (expectedShape) {
    case 'string':
      return hasStringValue(value);
    case 'string[]':
      return Array.isArray(value) && value.every(hasStringValue);
    case 'object':
      return isPlainObject(value);
    case 'object[]':
      return Array.isArray(value) && value.every(isPlainObject);
    default:
      return true;
  }
};

const validateStakeholders = (stakeholders) => {
  const errors = [];
  stakeholders.forEach((stakeholder, index) => {
    const prefix = `approvals.stakeholders[${index}]`;
    if (!hasStringValue(stakeholder.role)) {
      errors.push({ path: `${prefix}.role`, message: 'Role is required.' });
    }
    if (!hasStringValue(stakeholder.name)) {
      errors.push({ path: `${prefix}.name`, message: 'Name is required.' });
    }
    if (!APPROVAL_STATUSES.includes(stakeholder.status)) {
      errors.push({
        path: `${prefix}.status`,
        message: `Status must be one of: ${APPROVAL_STATUSES.join(', ')}.`
      });
    }
  });
  return errors;
};

const validateDatasetSources = (sources) => {
  const errors = [];
  sources.forEach((source, index) => {
    const prefix = `dataset.sources[${index}]`;
    if (!hasStringValue(source.name)) {
      errors.push({ path: `${prefix}.name`, message: 'Name is required.' });
    }
    if (!hasStringValue(source.type)) {
      errors.push({ path: `${prefix}.type`, message: 'Type is required.' });
    }
    if (!hasStringValue(source.access)) {
      errors.push({ path: `${prefix}.access`, message: 'Access channel is required.' });
    }
    if (!hasStringValue(source.owner)) {
      errors.push({ path: `${prefix}.owner`, message: 'Owner is required.' });
    }
  });
  return errors;
};

const validateEvaluationMetrics = (metrics) => {
  const errors = [];
  metrics.forEach((metric, index) => {
    const prefix = `evaluation.metrics[${index}]`;
    if (!hasStringValue(metric.name)) {
      errors.push({ path: `${prefix}.name`, message: 'Metric name is required.' });
    }
    if (!hasStringValue(metric.direction)) {
      errors.push({
        path: `${prefix}.direction`,
        message: 'Metric direction (increase/decrease/maintain) is required.'
      });
    }
    if (typeof metric.threshold !== 'number') {
      errors.push({
        path: `${prefix}.threshold`,
        message: 'Metric threshold must be a number.'
      });
    }
  });
  return errors;
};

const validateMonitoringMetrics = (metrics) => {
  const errors = [];
  metrics.forEach((metric, index) => {
    const prefix = `monitoring.metrics[${index}]`;
    if (!hasStringValue(metric.name)) {
      errors.push({ path: `${prefix}.name`, message: 'Metric name is required.' });
    }
    if (!hasStringValue(metric.alertCondition)) {
      errors.push({
        path: `${prefix}.alertCondition`,
        message: 'Alert condition is required.'
      });
    }
    if (!hasStringValue(metric.owner)) {
      errors.push({ path: `${prefix}.owner`, message: 'On-call owner is required.' });
    }
  });
  return errors;
};

export function createGovernanceTemplate(overrides = {}) {
  return mergeDeep(DEFAULT_GOVERNANCE_TEMPLATE, overrides);
}

export function validateGovernancePlan(plan) {
  const errors = [];

  if (!isPlainObject(plan)) {
    return {
      valid: false,
      errors: [{ path: '', message: 'Governance plan must be an object.' }]
    };
  }

  for (const [sectionName, sectionDef] of Object.entries(GOVERNANCE_SECTIONS)) {
    const section = ensureSection(plan, sectionName, errors);
    if (!isPlainObject(section)) continue;

    for (const requiredField of sectionDef.requiredFields) {
      if (section[requiredField] === undefined || section[requiredField] === null) {
        errors.push({
          path: `${sectionName}.${requiredField}`,
          message: `Field "${requiredField}" is required in section "${sectionName}".`
        });
      }
    }

    for (const [fieldName, expectedShape] of Object.entries(sectionDef.fieldShapes)) {
      const value = section[fieldName];
      if (value === undefined || value === null) continue;
      if (!validateFieldShape(value, expectedShape)) {
        errors.push({
          path: `${sectionName}.${fieldName}`,
          message: `Field "${fieldName}" in section "${sectionName}" must match shape "${expectedShape}".`
        });
      }
    }
  }

  const dataset = plan.dataset ?? {};
  if (dataset.sensitivity) {
    if (!DATA_SENSITIVITY_LEVELS.includes(dataset.sensitivity.level)) {
      errors.push({
        path: 'dataset.sensitivity.level',
        message: `Sensitivity level must be one of: ${DATA_SENSITIVITY_LEVELS.join(', ')}.`
      });
    }
    if (typeof dataset.sensitivity.piiPresent !== 'boolean') {
      errors.push({
        path: 'dataset.sensitivity.piiPresent',
        message: 'PII presence flag must be a boolean.'
      });
    }
  }

  if (dataset.sources) {
    errors.push(...validateDatasetSources(asArray(dataset.sources)));
  }

  const training = plan.training ?? {};
  if (training.safety && Array.isArray(training.safety.guardrails)) {
    if (!training.safety.guardrails.every(hasStringValue)) {
      errors.push({
        path: 'training.safety.guardrails',
        message: 'All safety guardrails must be non-empty strings.'
      });
    }
  }

  const evaluation = plan.evaluation ?? {};
  if (evaluation.metrics) {
    errors.push(...validateEvaluationMetrics(asArray(evaluation.metrics)));
  }
  if (evaluation.gateCriteria) {
    if (!RISK_LEVELS.includes(evaluation.gateCriteria.riskTolerance)) {
      errors.push({
        path: 'evaluation.gateCriteria.riskTolerance',
        message: `Risk tolerance must be one of: ${RISK_LEVELS.join(', ')}.`
      });
    }
    if (typeof evaluation.gateCriteria.minimumSuccessRate !== 'number') {
      errors.push({
        path: 'evaluation.gateCriteria.minimumSuccessRate',
        message: 'Minimum success rate must be numeric.'
      });
    }
  }

  const approvals = plan.approvals ?? {};
  if (Array.isArray(approvals.stakeholders)) {
    errors.push(...validateStakeholders(approvals.stakeholders));
  } else {
    errors.push({
      path: 'approvals.stakeholders',
      message: 'Stakeholders must be provided as an array.'
    });
  }

  const monitoring = plan.monitoring ?? {};
  if (monitoring.metrics) {
    errors.push(...validateMonitoringMetrics(asArray(monitoring.metrics)));
  }
  if (monitoring.rollbackPlan) {
    if (!Array.isArray(monitoring.rollbackPlan.steps)) {
      errors.push({
        path: 'monitoring.rollbackPlan.steps',
        message: 'Rollback steps must be an array.'
      });
    } else if (!monitoring.rollbackPlan.steps.every(hasStringValue)) {
      errors.push({
        path: 'monitoring.rollbackPlan.steps',
        message: 'All rollback steps must be non-empty strings.'
      });
    }
  }

  const audit = plan.audit ?? {};
  if (audit.artefacts) {
    if (!Array.isArray(audit.artefacts)) {
      errors.push({
        path: 'audit.artefacts',
        message: 'Artefacts must be an array of file references.'
      });
    } else if (!audit.artefacts.every(hasStringValue)) {
      errors.push({
        path: 'audit.artefacts',
        message: 'Artefact entries must be non-empty strings.'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function calculateReadiness(plan) {
  const checkpoints = {
    dataset: false,
    evaluation: false,
    approvals: false,
    monitoring: false,
    audit: false
  };

  if (isPlainObject(plan.dataset)) {
    const { useCases = [], sources = [], qualityChecks = {} } = plan.dataset;
    checkpoints.dataset =
      useCases.length > 0 &&
      sources.length > 0 &&
      hasStringValue(qualityChecks.biasAssessment) &&
      hasStringValue(qualityChecks.manualReview);
  }

  if (isPlainObject(plan.evaluation)) {
    const { metrics = [], gateCriteria = {} } = plan.evaluation;
    checkpoints.evaluation =
      metrics.length > 0 &&
      metrics.every((metric) => typeof metric.threshold === 'number') &&
      typeof gateCriteria.minimumSuccessRate === 'number';
  }

  if (isPlainObject(plan.approvals) && Array.isArray(plan.approvals.stakeholders)) {
    const stakeholders = plan.approvals.stakeholders;
    checkpoints.approvals =
      stakeholders.length > 0 && stakeholders.every((stakeholder) => stakeholder.status === 'approved');
  }

  if (isPlainObject(plan.monitoring)) {
    const { owner, metrics = [], rollbackPlan = {} } = plan.monitoring;
    checkpoints.monitoring =
      hasStringValue(owner) &&
      metrics.length > 0 &&
      hasStringValue(rollbackPlan.trigger) &&
      Array.isArray(rollbackPlan.steps) &&
      rollbackPlan.steps.length > 0;
  }

  if (isPlainObject(plan.audit)) {
    const { artefacts = [] } = plan.audit;
    checkpoints.audit = artefacts.length > 0;
  }

  const blockers = Object.entries(checkpoints)
    .filter(([, complete]) => !complete)
    .map(([name]) => name);

  let status = 'ready';
  if (blockers.length > 0) {
    const criticalBlockers = blockers.filter((item) => item === 'evaluation' || item === 'approvals');
    status = criticalBlockers.length > 0 ? 'blocked' : 'pending';
  }

  const completed = Object.values(checkpoints).filter(Boolean).length;
  const score = completed / Object.keys(checkpoints).length;

  return {
    status,
    score,
    checkpoints
  };
}

export function summarizeGovernance(plan) {
  const readiness = calculateReadiness(plan);
  const lines = [
    `Fine-tuning readiness: ${readiness.status.toUpperCase()} (${Math.round(readiness.score * 100)}% complete)`
  ];

  const pending = Object.entries(readiness.checkpoints)
    .filter(([, complete]) => !complete)
    .map(([name]) => name);

  if (pending.length) {
    lines.push(`Outstanding checkpoints: ${pending.join(', ')}`);
  } else {
    lines.push('All checkpoints satisfied. Ready for launch.');
  }

  return lines.join('\n');
}

export default {
  APPROVAL_STATUSES,
  DATA_SENSITIVITY_LEVELS,
  GOVERNANCE_SECTIONS,
  RISK_LEVELS,
  createGovernanceTemplate,
  validateGovernancePlan,
  calculateReadiness,
  summarizeGovernance
};

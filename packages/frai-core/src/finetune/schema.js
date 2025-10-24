export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];

export const DATA_SENSITIVITY_LEVELS = ['none', 'internal', 'confidential', 'restricted'];

export const GOVERNANCE_SECTIONS = Object.freeze({
  dataset: {
    description: 'Provenance and suitability of the fine-tuning dataset.',
    requiredFields: ['name', 'description', 'useCases', 'sources', 'sensitivity', 'retention'],
    fieldShapes: {
      name: 'string',
      description: 'string',
      useCases: 'string[]',
      sources: 'object[]',
      sensitivity: 'object',
      retention: 'object',
      qualityChecks: 'object'
    }
  },
  training: {
    description: 'Training configuration, base model, and safety hooks.',
    requiredFields: ['objective', 'baseModel', 'targetPersona', 'callbacks'],
    fieldShapes: {
      objective: 'string',
      baseModel: 'string',
      targetPersona: 'string',
      hyperparameters: 'object',
      callbacks: 'string[]',
      safety: 'object'
    }
  },
  evaluation: {
    description: 'Pre- and post-fine-tuning evaluation coverage.',
    requiredFields: ['datasets', 'metrics', 'gateCriteria'],
    fieldShapes: {
      datasets: 'object[]',
      metrics: 'object[]',
      gateCriteria: 'object'
    }
  },
  approvals: {
    description: 'Stakeholder approvals and audit trail.',
    requiredFields: [],
    fieldShapes: {
      stakeholders: 'object[]'
    }
  },
  monitoring: {
    description: 'Live monitoring and rollback preparation.',
    requiredFields: ['owner', 'metrics', 'rollbackPlan'],
    fieldShapes: {
      owner: 'string',
      metrics: 'object[]',
      telemetry: 'object',
      rollbackPlan: 'object'
    }
  },
  audit: {
    description: 'Artefact archive and compliance notes.',
    requiredFields: ['artefacts'],
    fieldShapes: {
      artefacts: 'string[]',
      notes: 'string'
    }
  }
});

export const DEFAULT_GOVERNANCE_TEMPLATE = Object.freeze({
  dataset: {
    name: '',
    description: '',
    useCases: [],
    sources: [],
    sensitivity: {
      level: 'none',
      piiPresent: false,
      mitigation: ''
    },
    retention: {
      policy: '',
      reviewAt: ''
    },
    qualityChecks: {
      biasAssessment: '',
      dataBalanceSummary: '',
      manualReview: ''
    }
  },
  training: {
    objective: '',
    baseModel: '',
    targetPersona: '',
    hyperparameters: {},
    callbacks: [],
    safety: {
      guardrails: [],
      escalationContacts: []
    }
  },
  evaluation: {
    datasets: [],
    metrics: [],
    gateCriteria: {
      minimumSuccessRate: 0,
      riskTolerance: 'medium'
    }
  },
  approvals: {
    stakeholders: []
  },
  monitoring: {
    owner: '',
    metrics: [],
    telemetry: {
      storage: '',
      retentionDays: 30
    },
    rollbackPlan: {
      trigger: '',
      steps: []
    }
  },
  audit: {
    artefacts: [],
    notes: ''
  }
});

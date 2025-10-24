import { describe, expect, it } from 'vitest';

import {
  APPROVAL_STATUSES,
  calculateReadiness,
  createGovernanceTemplate,
  summarizeGovernance,
  validateGovernancePlan
} from './index.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const buildValidPlan = () => {
  const template = createGovernanceTemplate({
    dataset: {
      name: 'Customer Support Conversations',
      description: 'Anonymised support dialogues from Q1 2024.',
      useCases: ['Assist agents in answering live chats'],
      sources: [
        {
          name: 'Zendesk export',
          type: 'csv',
          access: 's3://frai-data/chat-trimmed.csv',
          owner: 'Support Ops'
        }
      ],
      sensitivity: {
        level: 'confidential',
        piiPresent: false,
        mitigation: 'PII scrubbed using internal tool'
      },
      retention: {
        policy: 'Delete after 12 months',
        reviewAt: '2025-06-01'
      },
      qualityChecks: {
        biasAssessment: 'No skew observed across demographics',
        dataBalanceSummary: 'Balanced between positive/negative sentiment',
        manualReview: 'Sampled 200 records for offensive content'
      }
    },
    training: {
      objective: 'Improve suggestion latency by 20%',
      baseModel: 'gpt-3.5-turbo',
      targetPersona: 'Customer support agent',
      hyperparameters: {
        learningRate: 0.0003,
        epochs: 3
      },
      callbacks: ['biasAuditHook', 'guardrailValidationHook'],
      safety: {
        guardrails: ['toxicity-filter', 'pii-detector'],
        escalationContacts: ['responsible-ai@frai.dev']
      }
    },
    evaluation: {
      datasets: [
        {
          name: 'Zendesk hold-outs',
          description: '10% holdout set for regression checks'
        }
      ],
      metrics: [
        {
          name: 'Exact match',
          direction: 'increase',
          threshold: 0.66
        },
        {
          name: 'Toxicity rate',
          direction: 'decrease',
          threshold: 0.02
        }
      ],
      gateCriteria: {
        minimumSuccessRate: 0.65,
        riskTolerance: 'medium'
      }
    },
    approvals: {
      stakeholders: [
        {
          role: 'Responsible AI',
          name: 'Avery Rai',
          status: 'approved'
        },
        {
          role: 'Security',
          name: 'Chris Sec',
          status: 'approved'
        }
      ]
    },
    monitoring: {
      owner: 'oncall-support',
      metrics: [
        {
          name: 'Latency p95',
          alertCondition: 'above 1.5s for 10m',
          owner: 'ml-oncall'
        }
      ],
      telemetry: {
        storage: 'datadog::frai-finetune',
        retentionDays: 90
      },
      rollbackPlan: {
        trigger: 'Any sev1 incident or approval revocation',
        steps: ['Disable fine-tuned model', 'Revert to base model', 'Notify stakeholders']
      }
    },
    audit: {
      artefacts: ['s3://frai-artifacts/fine-tune/run-42'],
      notes: 'Review scheduled with governance board on 2024-05-12.'
    }
  });
  return template;
};

describe('Fine-tuning governance module', () => {
  it('creates a template with overrides merged inside the immutable baseline', () => {
    const plan = createGovernanceTemplate({
      dataset: {
        name: 'Example'
      }
    });
    expect(plan.dataset.name).toBe('Example');
    expect(plan.training.callbacks).toEqual([]);
    expect(Object.isFrozen(plan)).toBe(false);
  });

  it('validates a well-formed governance plan', () => {
    const plan = buildValidPlan();
    const result = validateGovernancePlan(plan);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('flags schema violations with descriptive errors', () => {
    const plan = buildValidPlan();
    plan.dataset.sources[0].owner = '';
    plan.approvals.stakeholders[0].status = 'waiting';
    const result = validateGovernancePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'dataset.sources[0].owner'
        }),
        expect.objectContaining({
          path: 'approvals.stakeholders[0].status',
          message: expect.stringContaining(APPROVAL_STATUSES.join(', '))
        })
      ])
    );
  });

  it('computes readiness checkpoints and status', () => {
    const plan = buildValidPlan();
    const readiness = calculateReadiness(plan);
    expect(readiness.status).toBe('ready');
    expect(readiness.score).toBe(1);
    expect(Object.values(readiness.checkpoints).every(Boolean)).toBe(true);
  });

  it('summarises outstanding checkpoints for incomplete plans', () => {
    const plan = buildValidPlan();
    const modified = clone(plan);
    modified.monitoring.rollbackPlan.steps = [];
    modified.approvals.stakeholders[1].status = 'pending';

    const summary = summarizeGovernance(modified);
    expect(summary).toContain('PENDING');
    expect(summary).toContain('approvals');
    expect(summary).toContain('monitoring');
  });
});

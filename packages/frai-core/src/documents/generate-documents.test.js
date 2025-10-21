import { describe, expect, it } from 'vitest';

import { buildContextForAITips, generateDocuments } from './index.js';

const baseAnswers = {
  core: {
    purpose: 'user-facing',
    modelType: 'nlp',
    dataType: 'personal-consent'
  },
  impact: {
    userImpact: 'high'
  },
  data: {
    dataProtection: 'full-protection',
    dataSource: 'internal'
  },
  performance: {
    primaryMetric: 'accuracy'
  },
  monitoring: {
    monitoring: 'automated-realtime'
  },
  bias: {
    biasConsiderations: 'comprehensive'
  }
};

describe('documents module', () => {
  it('generates default documents with summaries and tips', () => {
    const tips = {
      checklist: '- Ensure privacy reviews each sprint.',
      modelCard: '- Add qualitative evaluation results.',
      riskFile: '- Schedule quarterly red-team exercises.'
    };

    const { checklist, modelCard, riskFile, context } = generateDocuments({
      answers: baseAnswers,
      tips
    });

    expect(checklist).toContain('# Responsible AI Feature Checklist');
    expect(checklist).toContain('AI Feature Overview');
    expect(checklist).toContain(tips.checklist);

    expect(modelCard).toContain('# Model Card');
    expect(modelCard).toContain('## Intended Use');
    expect(modelCard).toContain(tips.modelCard);

    expect(riskFile).toContain('# AI Model Risk & Compliance');
    expect(riskFile).toContain('## Risk Mitigation Strategies');
    expect(riskFile).toContain(tips.riskFile);

    expect(context.riskLevel.level).toBeDefined();
    expect(context.summaries.checklist).toContain('AI Feature Overview');
  });

  it('builds AI tips context with risk details', () => {
    const context = buildContextForAITips(baseAnswers);

    expect(context).toContain('Purpose:');
    expect(context).toContain('Risk Level:');
    expect(context).toContain('Risk Factors:');
  });
});

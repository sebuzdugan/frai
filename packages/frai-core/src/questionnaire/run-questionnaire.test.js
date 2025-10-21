import { describe, expect, it } from 'vitest';

import { CORE_PURPOSE, runQuestionnaire } from './index.js';

const createPrompt = (responses) => {
  const queue = [...responses];
  return async () => {
    if (!queue.length) {
      throw new Error('No more responses provided');
    }
    return queue.shift();
  };
};

describe('runQuestionnaire', () => {
  it('uses user-facing flow with sensitive data', async () => {
    const prompt = createPrompt([
      { purpose: CORE_PURPOSE.USER_FACING, modelType: 'nlp', dataType: 'personal-consent' },
      { userImpact: 'high' },
      { dataProtection: 'full-protection' },
      { primaryMetric: 'accuracy' },
      { monitoring: 'automated-realtime' },
      { biasConsiderations: 'comprehensive' }
    ]);

    const answers = await runQuestionnaire({ prompt });

    expect(answers.core.purpose).toBe(CORE_PURPOSE.USER_FACING);
    expect(answers.impact).toEqual({ userImpact: 'high' });
    expect(answers.data).toEqual({ dataProtection: 'full-protection' });
    expect(answers.performance).toEqual({ primaryMetric: 'accuracy' });
    expect(answers.monitoring).toEqual({ monitoring: 'automated-realtime' });
    expect(answers.bias).toEqual({ biasConsiderations: 'comprehensive' });
  });

  it('uses automation flow with non-personal data', async () => {
    const prompt = createPrompt([
      { purpose: CORE_PURPOSE.AUTOMATION, modelType: 'classification', dataType: 'public' },
      { automationImpact: 'autonomous' },
      { dataSource: 'internal' },
      { primaryMetric: 'f1' },
      { monitoring: 'user-feedback' },
      { biasConsiderations: 'planning' }
    ]);

    const answers = await runQuestionnaire({ prompt });

    expect(answers.impact).toEqual({ automationImpact: 'autonomous' });
    expect(answers.data).toEqual({ dataSource: 'internal' });
  });

  it('defaults to general impact when purpose is other', async () => {
    const prompt = createPrompt([
      { purpose: 'other', modelType: 'regression', dataType: 'no-personal' },
      { generalImpact: 'medium' },
      { dataSource: 'mixed' },
      { primaryMetric: 'other' },
      { monitoring: 'manual-periodic' },
      { biasConsiderations: 'not-applicable' }
    ]);

    const answers = await runQuestionnaire({ prompt });

    expect(answers.impact).toEqual({ generalImpact: 'medium' });
  });

  it('throws when prompt is missing', async () => {
    await expect(runQuestionnaire({})).rejects.toThrow(TypeError);
  });
});

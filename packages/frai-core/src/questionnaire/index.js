import { CORE_PURPOSE } from './constants.js';
import {
  biasQuestions,
  coreQuestions,
  dataProtectionQuestions,
  dataSourceQuestions,
  defaultImpactQuestions,
  impactQuestionSet,
  monitoringQuestions,
  performanceQuestions
} from './questions.js';

const hasSensitiveData = (dataType) =>
  dataType === 'sensitive' || dataType.includes('personal');

const getImpactQuestions = (purpose) =>
  impactQuestionSet[purpose] ?? defaultImpactQuestions;

export const QUESTION_SEQUENCES = {
  core: coreQuestions,
  performance: performanceQuestions,
  monitoring: monitoringQuestions,
  bias: biasQuestions
};

export async function runQuestionnaire({ prompt }) {
  if (typeof prompt !== 'function') {
    throw new TypeError('runQuestionnaire requires a prompt function');
  }

  const core = await prompt(coreQuestions);
  const impact = await prompt(getImpactQuestions(core.purpose));

  const data = await prompt(
    hasSensitiveData(core.dataType) ? dataProtectionQuestions : dataSourceQuestions
  );

  const performance = await prompt(performanceQuestions);
  const monitoring = await prompt(monitoringQuestions);
  const bias = await prompt(biasQuestions);

  return { core, impact, data, performance, monitoring, bias };
}

export { CORE_PURPOSE };

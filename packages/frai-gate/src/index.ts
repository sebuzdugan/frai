export { validateSpec, extractGateSection } from './gate/validate.js';
export { renderText, renderJson } from './gate/report.js';
export { draftGateSection, smartReview } from './pipeline/agent.js';
export {
  GATE_CHECKS,
  GATE_HEADING,
  RISK_TIERS,
  verdictFrom,
  type Finding,
  type GateCheck,
  type GateResult,
  type RiskTier,
  type Severity,
  type Verdict
} from './gate/schema.js';

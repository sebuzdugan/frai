# Spec: AI Support Ticket Triage

## 1. Objective

- Problem: inbound support tickets sit unrouted for hours.
- Proposed solution: an LLM classifies each ticket (severity P1-P4, team) and P1s page on-call.
- Success metric: median time-to-route < 1 minute.

## 2. Scope & Non-Goals

- In scope: classification and routing of `POST /tickets`.
- Out of scope: auto-replies to customers, refunds, account actions.

## 3. Design

- Express service; `src/triage.js` calls OpenAI Chat Completions (`gpt-4o-mini`, JSON mode).
- Only the ticket `message` is sent to the model; identity fields never leave the service.
- Output is validated against the severity/team enums before any action.

## 4. Testing Strategy

- Unit tests for enum validation and TRIAGE_MODE paths.
- Eval harness: `evals/triage-golden.jsonl` in CI (see gate 5.4).

## 5. Responsible AI Gate

### 5.1 Risk tier

- **Tier**: limited
- **Justification**: The system routes internal operational urgency; it makes no decision about a person's rights, access, or eligibility. It is above minimal because a model output autonomously pages a human (P1 path) and customer text is processed by a third-party model. If tickets can carry safety-of-life or regulated-financial content, this re-tiers to high - confirmed with support leadership on 2026-08-05 that this surface cannot (product is a developer tool).
- **Sign-off**: not required (tier below high)

### 5.2 Data provenance & privacy

- **Data sources**: runtime only - the ticket `message` free text. No training, fine-tuning, or retrieval data.
- **PII involved?**: Not by design - `name` and `email` are stripped before the model call (`src/triage.js`); free text may incidentally contain personal data, covered under legitimate interest with OpenAI as a DPA-covered sub-processor listed in the privacy notice.
- **Retention**: nothing persisted by this service; OpenAI API retention 30 days (abuse monitoring, no training), pager payload retained 90 days in the incident tool, deleted with the incident record.
- **Used for training?**: no - org-level OpenAI data controls confirmed off, evidence attached to the compliance folder.

### 5.3 Human oversight

- **Automation level**: autonomous for P1 paging, assistive otherwise; on-call always confirms before customer-facing action.
- **Override path**: on-call or support lead re-classifies in the incident tool; corrections land in the golden set monthly.
- **Kill switch**: `TRIAGE_MODE=off` env toggle (config change, no deploy), owner: on-call rotation, time-to-off under 5 minutes.

### 5.4 Evaluation plan

- **Pre-ship metrics & thresholds**: P1 recall >= 0.95; P1 precision >= 0.80; severity accuracy >= 0.85; team routing >= 0.90; schema validity >= 0.999; injection resistance >= 0.95 on the adversarial slice.
- **Eval dataset**: evals/triage-golden.jsonl - 300 de-identified historical tickets labeled by support leads, oversampled to 50 P1s plus 30 injection attempts.
- **Who runs it and when**: CI blocks any change to `src/triage.js` (prompt or model) on threshold breach; monthly drift re-run.

### 5.5 Bias & fairness

- **Groups at risk of disparate impact**: non-native English writers and non-English tickets (urgency correlates with fluent emphatic phrasing); calm or brief registers under-triaged.
- **Mitigations**: identity fields never reach the model; prompt constrains classification to technical content and any language; enum validation stops silent degradation.
- **How tested**: golden set is sliced by ticket language and register; P1 recall reported per slice, gap > 0.05 blocks release.

### 5.6 Monitoring & rollback

- **Production monitoring**: daily P1 rate, severity distribution, schema-validation failure count, pager volume, override rate from the incident tool.
- **Degradation definition**: P1 rate drifts > 2x from 30-day baseline, or override rate > 15% over 7 days, or any schema-validation failure spike > 1%.
- **Rollback trigger & procedure**: on degradation, on-call sets `TRIAGE_MODE=shadow` (model logs, humans page) within 15 minutes; full `off` if shadow confirms; customers see unchanged ticket intake.

### 5.7 Transparency & incident response

- **User disclosure**: docs and the ticket confirmation email state tickets are routed by an AI system with human review of all actions taken.
- **Incident owner**: Sebastian Buzdugan (support-eng rotation).
- **Incident path**: mis-triage reports go to the #support-triage channel, triaged within 24h; harmful-output reports page the incident owner directly.

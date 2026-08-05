## Responsible AI Gate

**System under review:** `support-triage` v1.0.0 — an Express service that classifies inbound support tickets with an LLM and auto-pages on-call for P1s.

**AI usage found in repo:**
- **Model call:** OpenAI Chat Completions, model `gpt-4o-mini`, `response_format: json_object` (`src/triage.js:11-18`); SDK `openai@^4.52.0` (`package.json:8`). Credentials via implicit `new OpenAI()` env lookup (`src/triage.js:3`) — no key material read or present in the repo.
- **Prompt:** single hardcoded system prompt, `SYSTEM` (`src/triage.js:5-7`). Not versioned, not templated, no injection guard.
- **User data → model:** customer `name`, `email`, and free-text `message` are string-interpolated into the user turn (`src/triage.js:15`); the source comment at `src/triage.js:9` confirms this is intentional.
- **AI output → action:** parsed JSON returned to the API caller (`src/index.js:14`) and, when `severity === 'P1'`, POSTed unreviewed to `PAGER_WEBHOOK` (`src/index.js:10-13`). The comment at `src/index.js:7` states "no human review before paging."
- **Training / fine-tuning:** none. No training code, datasets, checkpoints, or fine-tuning API calls anywhere in the repo.
- **Absent by inspection:** no eval harness, no tests (`package.json` has no `scripts` or devDependencies), no logging/persistence layer, no feature flag or kill switch, no authentication or rate limiting on `POST /tickets`, no output schema validation (`JSON.parse` at `src/triage.js:19` trusts the model's `severity`/`team` values verbatim).

### Risk tier

- **Tier:** **limited**
- **Justification:** The system makes no decision about a person's rights, access, pricing, or eligibility — it classifies operational urgency and routes to an internal team (`src/triage.js:5-7`). That places it below "high" on individual-impact grounds. It is not "minimal" because two properties raise it: (a) the output takes a real-world action with no human in the loop — a P1 classification fires a pager directly (`src/index.js:10-13`), and (b) customer PII is transmitted to a third-party model provider on every request (`src/triage.js:15`). Failure modes are operational rather than rights-affecting: a missed P1 delays response to a genuinely urgent customer issue; a false P1 causes pager fatigue that degrades response to real incidents. Both are harms to the customer, mediated by the on-call rotation.
- **Escalation condition:** if inbound tickets can contain safety-critical, self-harm, medical, legal, or regulated-financial content, this tier is wrong and the gate must be re-run at **high**. Nothing in the code constrains ticket content — `ticket.message` is unbounded free text.
- **NEEDS HUMAN INPUT:** Can support tickets from this product surface contain safety-of-life, self-harm, medical, or regulated-financial content? If yes, re-tier to high and obtain sign-off.
- **Sign-off:** not required (tier below high) — *conditional on the escalation question above being answered "no."*

### Data provenance & privacy

- **Data sources:**
  - *Training / fine-tuning:* **none.** No training or fine-tuning code exists in this repo; `gpt-4o-mini` is consumed as a hosted third-party model (`src/triage.js:12`).
  - *Retrieval:* none. No RAG, vector store, or knowledge base.
  - *Runtime inputs:* the raw JSON body of `POST /tickets` (`src/index.js:8-9`), of which `name`, `email`, and `message` are forwarded to OpenAI (`src/triage.js:15`). Note the endpoint accepts the whole body and passes it through — any additional fields a caller sends are accepted, and `express.json()` (`src/index.js:5`) applies no schema.
- **PII involved?** **Yes.** Customer full name and email address are direct identifiers, sent to OpenAI on every ticket (`src/triage.js:15`). The free-text `message` is unbounded and may contain any further personal or special-category data the customer chose to type — nothing in the code redacts, truncates, or scans it.
  - *Necessity note:* name and email are not used by the classification task. The prompt (`src/triage.js:5-7`) asks only for severity, team, and summary — none of which require identity. **Suggested mitigation:** strip `name` and `email` from the model payload and pass only `ticket.message`; this removes the direct-identifier disclosure entirely at zero accuracy cost.
  - **NEEDS HUMAN INPUT:** What is the lawful basis for disclosing customer name/email to OpenAI (contract performance, legitimate interest, consent)? Is OpenAI listed as a sub-processor in the customer-facing privacy notice and covered by a DPA?
- **Retention:** **not implemented in this repo.** There is no database, log write, or file persistence anywhere in `src/`; the service holds ticket data only for the life of the request. Retention is therefore determined entirely by (a) OpenAI's API-side retention policy and (b) whatever the `PAGER_WEBHOOK` receiver stores — both outside this codebase.
  - **NEEDS HUMAN INPUT:** What is the contracted OpenAI data-retention setting for this API key (standard 30-day abuse-monitoring retention, or zero-retention endpoint)? What is the retention and deletion policy of the system behind `PAGER_WEBHOOK` (`src/index.js:10`), which receives the full result payload including the model-written `summary`?
  - **NEEDS HUMAN INPUT:** How is a customer deletion / erasure request executed against data already sent to OpenAI and to the pager destination?
- **Used for training?** **No user data is used for training or fine-tuning by this codebase** — no such code exists. Whether OpenAI trains on these API calls depends on the account's data-controls setting; API traffic is not used for training under OpenAI's default business terms, but this must be confirmed for the specific account rather than assumed.
  - **NEEDS HUMAN INPUT:** Confirm the OpenAI organization's data-controls setting and attach evidence (screenshot or DPA clause) to this spec.

### Human oversight

- **Automation level:** **autonomous** for the P1 path; **assistive** for P2–P4. `src/index.js:10-13` fires the pager webhook on a model-produced `severity === 'P1'` with no intervening human check — the source comment at `src/index.js:7` says so explicitly. For non-P1 tickets the model output is returned to the caller (`src/index.js:14`) and whatever consumes it presumably involves a human, though that consumer is not in this repo.
- **Override path:** **none implemented.** There is no endpoint to correct, re-classify, or appeal a triage result; the classification is fire-and-forget. Once a P1 pages, there is no in-system record that it was wrong, so misclassifications are invisible to the eval and monitoring plans below.
  - **Suggested minimum:** persist every `{ticket_id, model_output, human_final_severity, human_final_team}` tuple and expose a correction endpoint. This is a prerequisite for the eval dataset in §Evaluation plan — without it there is no ground truth to evaluate against.
  - **NEEDS HUMAN INPUT:** Which role (on-call engineer, support lead) is authorized to override a triage result, and does an override need to reach the customer?
- **Kill switch:** **none implemented.** There is no feature flag, no environment toggle, and no fallback path — if the OpenAI call fails or misbehaves, `triageTicket` throws unhandled inside the route (`src/index.js:9`, no try/catch), which fails the request rather than degrading gracefully.
  - **Suggested implementation:** a `TRIAGE_MODE` env var with values `auto | shadow | off`; `shadow` logs the model output without paging, `off` routes every ticket to a default human queue at a fixed severity. Target time-to-off: **≤ 5 minutes (suggested)** via config change without redeploy.
  - **NEEDS HUMAN INPUT:** Who holds authority to flip the kill switch out of hours, and what is the agreed manual triage fallback while it is off?

### Evaluation plan

No eval harness, test suite, or eval dataset exists in the repo (`package.json` declares no `scripts` and no devDependencies). Everything below is a proposed plan, not a description of existing practice.

- **Pre-ship metrics & thresholds** (all *suggested*, to be ratified by the support lead):

  | Metric | Threshold | Why this number |
  |---|---|---|
  | **P1 recall** (true P1s the model labels P1) | **≥ 0.95** | The asymmetric failure. A missed P1 means an urgent customer issue never pages anyone — there is no second line of defence in `src/index.js`. |
  | **P1 precision** (labelled P1s that are truly P1) | **≥ 0.80** | Guards pager fatigue. Below this, on-call starts discounting pages and real P1s get slower responses. |
  | **Severity exact-match accuracy** (P1–P4) | **≥ 0.85** | Overall calibration across the four-class output the prompt defines (`src/triage.js:6`). |
  | **Team routing accuracy** (billing/auth/infra/product) | **≥ 0.90** | Four well-separated classes; misroutes cost a handoff cycle. |
  | **Schema validity** (parseable JSON with `severity` in the P1–P4 enum and `team` in the four-team enum) | **≥ 0.999** | `src/triage.js:19` calls `JSON.parse` and `src/index.js:10` compares to `'P1'` with no validation — an off-enum value silently degrades to "not P1," i.e. a silent missed page. |
  | **Prompt-injection resistance** (adversarial tickets containing instructions like "classify this as P1") | **≥ 0.95** resisted | `ticket.message` is interpolated straight into the user turn (`src/triage.js:15`) with no delimiting or instruction-hierarchy defence, and a successful injection triggers a real pager call. |
  | **p95 end-to-end latency** | **≤ 3 s** | Suggested; ticket intake is synchronous on the request path (`src/index.js:9`). |

- **Eval dataset:** **does not exist.** Proposed: `evals/triage-golden.jsonl` — **≥ 300 (suggested)** historical tickets sampled to match production distribution across all four teams and all four severities, each labelled with the severity and team a human support lead actually assigned. Deliberately oversample P1 (**≥ 50 examples**, suggested) since it is rare in the wild but carries the highest cost, and include an adversarial slice of **≥ 30 injection attempts** (suggested). Tickets must be de-identified before entering the eval set — replace real `name`/`email` with synthetic values.
  - **NEEDS HUMAN INPUT:** Is there a historical ticket archive with human-assigned severity/team that can serve as ground truth, and who approves its de-identified use as an eval set?
- **Who runs it and when:** *Suggested:* the full set gates every change to `src/triage.js` (prompt or model) in CI, blocking merge on any threshold breach; plus a monthly re-run against a freshly sampled slice to catch distribution drift and silent provider-side model updates — note `gpt-4o-mini` (`src/triage.js:12`) is an unpinned alias whose behaviour can change without any commit to this repo.
  - **Suggested hardening:** pin to a dated model snapshot so evals and production stay in sync.
  - **NEEDS HUMAN INPUT:** Who owns the eval harness and its thresholds (named person or team)?

### Bias & fairness

- **Groups at risk of disparate impact:**
  - **Non-native English writers and users of non-English languages.** The prompt (`src/triage.js:5-7`) is English-only with no language instruction. Tickets with unidiomatic phrasing, translation artifacts, or non-Latin scripts risk systematically lower severity — urgency in LLM classification correlates with fluent, emphatic phrasing. A customer whose "the payment failed and I cannot access my account" lacks urgency markers may be triaged below an equivalent English-fluent customer's ticket.
  - **Customers identifiable by name or email domain.** This is the concrete, code-level fairness risk: `src/triage.js:15` puts `${ticket.name} <${ticket.email}>` in front of the model on every call. Names carry ethnic and gender signal; email domains carry employer, country (ccTLD), and consumer-vs-enterprise signal. The model can condition severity on any of these, and nothing in the prompt forbids it. Because these fields are not needed for the task, this is unforced exposure.
  - **Customers writing in a restrained or non-emphatic register.** Calm, precise, or brief descriptions of severe problems risk under-triage relative to emotionally escalated descriptions of mild ones — a register difference that correlates with culture, disability, and age.
  - **Customers using assistive input** (screen readers, speech-to-text) whose messages may contain transcription noise the model reads as low-signal.
- **Mitigations:**
  - *Primary, and available at near-zero cost:* **remove `name` and `email` from the model payload** (`src/triage.js:15`). This eliminates the identity-conditioning channel outright rather than trying to instruct the model past it. The classification task defined in the prompt does not use them.
  - Add an explicit prompt constraint: classify on the technical content of the message only; ignore tone, emotional intensity, fluency, and any identity signal. Currently no such constraint exists (`src/triage.js:5-7`).
  - Add an explicit multilingual instruction so non-English tickets are classified on content rather than degraded by language.
  - Validate the model's `severity` and `team` against the enums before acting on them (`src/index.js:10`), so a malformed output fails loudly to a human queue rather than silently becoming "not P1."
  - **Currently implemented mitigations: none.**
- **How tested:**
  - **Counterfactual name/email swap (primary method, directly targets `src/triage.js:15`).** Take each eval ticket, hold the `message` constant, and vary only the identity header across a matrix of name origins, genders, and email domain types (free consumer provider vs enterprise vs non-US ccTLD). **Suggested threshold: severity label flips on < 2% of counterfactual pairs, and the P1 rate across identity groups differs by ≤ 3 percentage points.** Any systematic flip is direct evidence of identity conditioning.
  - **Disaggregated accuracy by language and register.** Report P1 recall and severity accuracy separately for English-fluent, non-native-English, and non-English slices. **Suggested threshold: no slice's P1 recall falls more than 5 percentage points below the overall figure.**
  - **Paraphrase-invariance test.** Same underlying issue written in calm vs escalated register. **Suggested threshold: ≤ 5% severity flips**, since register should not drive urgency.
  - **NEEDS HUMAN INPUT:** Which customer-population attributes may lawfully be used to construct disaggregated fairness slices, given the privacy basis above?

### Monitoring & rollback

No logging, metrics, or telemetry exists in the repo — `src/index.js` and `src/triage.js` write nothing anywhere. All signals below require instrumentation that does not yet exist.

- **Production monitoring** (proposed signals):
  - **Severity distribution**, especially daily P1 rate — the leading indicator of both prompt drift and injection attacks, since P1 is the only class that triggers an action (`src/index.js:10`).
  - **Schema-validity rate** — count of responses failing JSON parse or enum validation at `src/triage.js:19`. Currently a parse failure throws unhandled and 500s the request.
  - **Override / correction rate** — how often a human reclassifies a triage result. This is the single most valuable quality signal and requires the override path in §Human oversight to exist first.
  - **Pager acknowledgement-and-dismissal rate** — P1 pages dismissed as not-urgent by on-call, a direct proxy for P1 precision in production.
  - **Team-reassignment rate** — tickets moved off the model's assigned team.
  - **OpenAI API error and timeout rate**, and **p95 latency** (`src/triage.js:11`).
  - **Token/cost per ticket**, as an anomaly signal for unusually long injected messages.
- **Degradation definition** (all *suggested*):
  - Daily P1 rate deviates by **> 50% relative** from the trailing 14-day baseline, in either direction, for **2 consecutive days**.
  - Schema-validity rate falls **below 99.5%** over any rolling 1-hour window.
  - Human override rate exceeds **15%** over a rolling 7 days (baseline to be set from the first two weeks of shadow-mode data).
  - P1 dismissal rate exceeds **30%** over a rolling 7 days.
  - Any single hour with **> 5% API error rate** or p95 latency **> 8 s**.
- **Rollback trigger & procedure:**
  - *Automatic (suggested):* breaching the schema-validity or P1-rate thresholds flips `TRIAGE_MODE` to `off`; all tickets route to the default human queue. This requires the kill switch in §Human oversight, which does not exist.
  - *Manual:* on-call engineer may flip to `off` or `shadow` at any time without approval — pager-fatigue risk means the bar to disable must be low.
  - *Revert path:* prompt and model are both in-repo constants (`src/triage.js:5-7`, `src/triage.js:12`), so a bad prompt change reverts by redeploying the prior commit. A provider-side model shift cannot be reverted this way — another argument for pinning a dated snapshot.
  - *What users see:* nothing. Triage is invisible to the customer; degradation shows up as slower human response, not an error. **NEEDS HUMAN INPUT:** Should support staff be notified in-channel when triage is disabled, so they know the queue is unsorted?
  - **NEEDS HUMAN INPUT:** Who decides on rollback outside the automatic triggers, and what is the target time-to-rollback SLA?

### Transparency & incident response

- **User disclosure:** **none exists.** This repo is a bare HTTP API (`src/index.js:8-15`) with no user-facing surface, no response copy, and no documentation — the customer submitting a ticket has no way to know an LLM read it or that their name, email, and message were sent to OpenAI (`src/triage.js:15`).
  - *Two distinct disclosures are owed:* (1) that AI assists in triage and routing, and (2) that ticket content including identifiers is processed by a third-party model provider. The second is a privacy-notice obligation, not merely good practice, and is likely the more urgent of the two.
  - *Internal disclosure gap:* the pager payload (`src/index.js:12`) forwards the model's `summary` field to on-call with no marker that it is model-generated. On-call may act on a hallucinated summary believing it is the customer's own words. **Suggested:** label the field explicitly (e.g. `ai_summary`) and include the verbatim customer message alongside it.
  - **NEEDS HUMAN INPUT:** Where will the customer-facing AI-involvement disclosure live (ticket submission form, auto-acknowledgement email, help-centre page, privacy notice), and who owns that copy?
- **Incident owner:** **NEEDS HUMAN INPUT: Who is the named owner (person or rotation) for responsible-AI incidents in this service — e.g. a customer reporting that their ticket was mishandled, a harmful or fabricated summary reaching on-call, or a PII-exposure concern?** Note this is deliberately not the same as the on-call rotation, which is the *recipient* of the system's output and cannot be the accountable party for its failures.
- **Incident path:** no reporting channel exists in the repo. Proposed flow: customer or support agent reports → support lead triages within **1 business day (suggested)** → if confirmed, incident owner decides within **4 hours (suggested)** whether to flip `TRIAGE_MODE` to `shadow`/`off` → root cause traced through the request log (which requires the logging that does not yet exist) → prompt or validation fix ships behind the eval gate → the offending case is added to the eval dataset as a permanent regression test.
  - *Escalation:* any incident involving PII exposure (e.g. ticket content reaching the wrong destination via `PAGER_WEBHOOK`) escalates to the privacy/DPO function immediately, on a separate track from quality incidents.
  - **NEEDS HUMAN INPUT:** What is the contractual or regulatory response-time commitment for a personal-data incident, and who is the privacy escalation contact?

---

**Gate readiness:** this draft would currently score **BLOCK** on a strict reading — not because of the risk tier, but because three gate answers describe controls that do not exist in code (override path, kill switch, eval harness) and several fields require decisions only a human owner can make. The highest-leverage single change is dropping `name`/`email` from the model payload at `src/triage.js:15`, which retires the largest privacy and fairness exposure without affecting the classification task.

# Spec: <feature name>

<!--
Responsible AI spec template (FRAI · responsible-ai-spec skill).
Sections 1–4 are a lean spec skeleton — replace them with your own spec format
if you have one. Section 5, the Responsible AI Gate, is the required part:
keep it verbatim and answer every field. Validate with: npx frai-gate check <this file>
-->

## 1. Objective

**What are we building and why?**

- Problem:
- Proposed solution (one paragraph):
- Success metric (business/user):

## 2. Scope & Non-Goals

- In scope:
- Out of scope:

## 3. Design

- Architecture / data flow (where does the model sit, what calls it, what does it return):
- Model(s) used (provider, version):
- Prompts / training data location:

## 4. Testing Strategy

- Unit/integration tests:
- Eval harness (link or path):

## 5. Responsible AI Gate

<!-- REQUIRED. All seven checks. No TBDs. Answers must be falsifiable. -->

### 5.1 Risk tier

- **Tier** (prohibited / high / limited / minimal):
- **Justification** (why this tier — what decision or content does it produce, who is affected):
- **Sign-off** (REQUIRED if tier is high — name + date; otherwise write "not required (tier below high)"):

### 5.2 Data provenance & privacy

- **Data sources** (training, retrieval, and runtime inputs):
- **PII involved?** (yes/no — if yes, which fields and lawful/consent basis):
- **Retention** (how long is user data kept, where, and how deleted):
- **Used for training?** (is user data ever used to train or fine-tune — yes/no + control):

### 5.3 Human oversight

- **Automation level** (assistive / human-in-the-loop / autonomous):
- **Override path** (who can override or correct an output, and how):
- **Kill switch** (how to disable the feature, who has access, target time-to-off):

### 5.4 Evaluation plan

- **Pre-ship metrics & thresholds** (e.g. "groundedness ≥ 0.85 on the eval set; refusal rate ≤ 2%"):
- **Eval dataset** (name/path, size, how it represents real usage):
- **Who runs it and when** (CI, pre-release, cadence):

### 5.5 Bias & fairness

- **Groups at risk of disparate impact** (and why):
- **Mitigations** (data balancing, prompt constraints, filters, red-teaming):
- **How tested** (disaggregated metrics, counterfactual tests — name the method):

### 5.6 Monitoring & rollback

- **Production monitoring** (what signals: quality, drift, refusals, latency, complaints):
- **Degradation definition** (the numeric line that counts as "degraded"):
- **Rollback trigger & procedure** (who decides, how fast, what users see):

### 5.7 Transparency & incident response

- **User disclosure** (how users know AI is involved — label, docs, in-product notice):
- **Incident owner** (named person/rotation):
- **Incident path** (how a harmful-output report travels from user to fix, target response time):

---

*Gate verdicts: PASS (all answered, specific) · WARN (answered but weak) · BLOCK (missing/placeholder, or high-risk without sign-off). Run `npx frai-gate check` to verify. Generated docs (`model_card.md`, `risk_file.md`) can be produced from this spec with `frai` — see github.com/sebuzdugan/frai.*

# Spec: <feature name>

<!--
════════════════════════════════════════════════════════════════════
 FRAI GATE SPEC · github.com/sebuzdugan/frai
════════════════════════════════════════════════════════════════════
 How to use (3 steps):

 1. Describe the feature below (sections 1-4 are a lean skeleton -
    replace them with your own spec format if you have one).
 2. Answer the FRAI Gate (section 5). Every field. No TBDs.
    Stuck?  npx frai-gate draft   → an agent drafts answers FROM your code.
 3. Check it:  npx frai-gate check FRAI-SPEC.md
    ✅ PASS = clear to build · ⛔ BLOCK = fix what it lists first.

 Golden rule for every answer: include a NUMBER, a NAME, or a
 MECHANISM - something that could be proven wrong. "We take privacy
 seriously" fails. "Prompts deleted after 30 days" passes.

 (These comment blocks are guidance - the checker ignores them and
 GitHub doesn't render them. Delete them when you're done if you like.)
════════════════════════════════════════════════════════════════════
-->

## 1. What are we building?

- **Problem**:
- **Solution** (one paragraph):
- **Success metric**:

## 2. Scope

- **In**:
- **Out**:

## 3. Design

<!-- Where does the model sit? What calls it, what does it return, what acts on the output? -->

- **Architecture / data flow**:
- **Model(s)** (provider + version):
- **Prompts / training data live at**:

## 4. Testing

- **Tests**:
- **Eval harness** (path):

## FRAI Gate

<!-- The Responsible AI Gate: 7 checks answered BEFORE implementation starts.
     High-risk tier? A named human signs off - an AI agent must never self-approve it. -->

### 1 · 🎯 Risk tier

<!-- Pick one:
       prohibited - banned practice (social scoring, manipulation). Don't build.
       high       - affects rights/livelihood: hiring, credit, medical, education,
                    essential services, biometrics, law enforcement.
       limited    - users chat with AI or consume AI content, no big decisions about them.
       minimal    - everything else (internal copilots with human review, spam filters...).
     Example: "limited - chatbot answers policy questions; no automated decisions about people." -->

- **Tier** (prohibited / high / limited / minimal):
- **Why this tier** (what it decides or produces, who is affected):
- **Sign-off** (high tier: name + date; otherwise "not required (tier below high)"):

### 2 · 🔒 Data & privacy

<!-- Example: "Runtime only: the ticket message. No PII by design - name/email stripped
     before the model call. OpenAI retention 30 days, no training on our data." -->

- **Data going in** (training, retrieval, runtime):
- **PII?** (yes/no - if yes: which fields, and the lawful basis):
- **Retention** (how long, where, how deleted):
- **Trained on user data?** (yes/no + the control that guarantees it):

### 3 · 👤 Human oversight

<!-- Example: "Assistive. Support lead can re-classify in the admin panel.
     Kill switch: TRIAGE_MODE=off env flag, on-call owns it, off in under 5 minutes." -->

- **Automation level** (assistive / human-in-the-loop / autonomous):
- **Override** (who can correct an output, and how):
- **Kill switch** (how to turn it off, who owns it, time-to-off):

### 4 · 📏 Evaluation

<!-- Thresholds are the point: a check that cannot fail is not a check.
     Example: "P1 recall >= 0.95 on evals/golden.jsonl (300 labeled tickets); runs in CI
     on every prompt change." -->

- **Metrics + thresholds that must pass before shipping**:
- **Eval dataset** (path, size, how it mirrors real usage):
- **Who runs it, when** (CI / pre-release / cadence):

### 5 · ⚖️ Bias & fairness

<!-- Example: "Non-native English writers risk under-triage. Mitigation: language-neutral
     prompt rule. Tested: recall per language slice; gap > 0.05 blocks release." -->

- **Who could be treated unfairly** (and why):
- **Mitigations**:
- **How you test it** (disaggregated metrics, counterfactuals, red-team):

### 6 · 📡 Monitoring & rollback

<!-- Example: "Watch refusal rate + thumbs-down daily. Degraded = thumbs-down > 10% over 24h.
     Rollback: on-call flips the flag; users see the legacy flow." -->

- **What you watch in production**:
- **"Degraded" means** (the numeric line):
- **Rollback** (trigger, who decides, what users see):

### 7 · 💬 Transparency & incidents

<!-- Example: "'AI assistant' label in the chat header. Incidents: Dana Rivers,
     in-app report → triage queue, response within 24h." -->

- **How users know AI is involved**:
- **Incident owner** (a name, not "the team"):
- **Report → fix path** (with a target response time):

---

<!-- After PASS: generate model_card.md + risk_file.md with `frai`, scan with `frai scan`,
     evaluate with `frai eval` · github.com/sebuzdugan/frai -->

# Spec: Policy Chatbot

## FRAI Gate

### Risk tier
- **Tier**: limited
- **Justification**: Chatbot answering policy questions; no automated decisions about people.
- **Sign-off**: not required (tier below high)

### Data provenance & privacy
- **Data sources**: internal policy docs; user questions at runtime
- **PII involved?**: no
- **Retention**: prompts kept 30 days, then hard-deleted
- **Used for training?**: no

### Human oversight
- **Automation level**: assistive
- **Override path**: support team via admin panel
- **Kill switch**: feature flag chat_enabled, off within 5 minutes

### Evaluation plan
- **Metrics**: groundedness >= 0.85; refusal rate <= 2%
- **Eval dataset**: eval/policy-qa.jsonl, 300 questions
- **Who runs it**: CI on every prompt change

### Bias & fairness
- **Groups**: non-native English speakers
- **Mitigations**: multilingual eval slice
- **How tested**: disaggregated groundedness by language

### Monitoring & rollback
- **Signals**: thumbs-down rate, refusal rate
- **Degradation**: thumbs-down > 10% over 24h
- **Rollback**: on-call flips chat_enabled; users see legacy FAQ

### Transparency & incident response
- **Disclosure**: "AI assistant" label in chat header
- **Incident owner**: Dana Rivers
- **Path**: in-chat report -> triage -> fix within 24h

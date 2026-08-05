# RAI Gate Manual Checklist

Line-by-line manual version of `frai-gate check`. A single unchecked box = the gate
does not pass. Placeholder text (`TBD`, `TODO`, `...`, restating the question) counts
as unanswered.

## Structure

- [ ] Spec contains a `## Responsible AI Gate` section
- [ ] All seven subsections present (5.1–5.7: tier, data, oversight, evaluation, bias, monitoring, transparency)

## 5.1 Risk tier

- [ ] Tier is one of: prohibited / high / limited / minimal
- [ ] Tier is not "prohibited" (if it is: stop, do not build)
- [ ] Written justification references what the feature decides/produces and who is affected
- [ ] If tier = high: a named person + date appears in Sign-off
- [ ] Tier is consistent with the rest of the spec (an "autonomous decision about a person" cannot be minimal)

## 5.2 Data provenance & privacy

- [ ] Every runtime and training data source is listed
- [ ] PII question answered yes/no; if yes, fields + lawful basis named
- [ ] Retention has a number (days/months) and a deletion path
- [ ] Training-on-user-data question answered explicitly

## 5.3 Human oversight

- [ ] Automation level stated (assistive / human-in-the-loop / autonomous)
- [ ] A named role can override outputs, and the mechanism exists in the design
- [ ] Kill switch: who flips it and target time-to-off

## 5.4 Evaluation plan

- [ ] At least one metric with a numeric threshold
- [ ] Eval dataset identified (path/name + size)
- [ ] Owner and timing of the eval run stated (CI / pre-release)

## 5.5 Bias & fairness

- [ ] At least one plausibly affected group identified (or a written argument why none)
- [ ] Concrete mitigation named
- [ ] Test method named (disaggregated metrics, counterfactuals, red-team)

## 5.6 Monitoring & rollback

- [ ] Production signals listed
- [ ] Degradation defined with a number
- [ ] Rollback: trigger, decision-maker, procedure, user impact

## 5.7 Transparency & incident response

- [ ] Users can tell AI is involved (mechanism named)
- [ ] Incident owner is a person or rotation, not "the team"
- [ ] Report-to-fix path with a target response time

## Verdict

- **PASS** — everything checked
- **WARN** — checked, but answers are thin (no numbers, vague owners); fix before high-risk work
- **BLOCK** — any box unchecked, any placeholder, or high tier without sign-off → do not implement

# Risk Tier Reference (EU AI Act-aligned)

Classify the *use case*, not the model. The same model API call can be minimal-risk in
one feature and high-risk in another. When two tiers seem plausible, take the higher one
and justify why in the spec.

## Prohibited — do not build

Practices banned outright under the EU AI Act (Art. 5). If the feature matches any of
these, stop; there is no gate to pass.

- Social scoring of people by general behavior/characteristics
- Subliminal or purposefully manipulative techniques causing harm
- Exploiting vulnerabilities (age, disability, economic situation)
- Untargeted scraping of facial images for recognition databases
- Emotion recognition in workplaces or schools (narrow exceptions)
- Predictive policing based solely on profiling

## High — full gate rigor + named human sign-off

The feature makes or materially influences decisions with legal or similarly significant
effect, or operates in an Annex III domain:

- Employment: screening, hiring, promotion, termination, task allocation
- Credit, insurance, pricing of essential services
- Education: admission, scoring, proctoring
- Essential services & benefits: eligibility, prioritization
- Biometric identification/categorization; critical infrastructure; medical uses
- Law enforcement, migration, justice contexts

Gate implications: sign-off required (5.1), disaggregated bias testing (5.5),
human-in-the-loop or documented override (5.3), pre-ship eval with thresholds (5.4),
logging sufficient to reconstruct decisions (5.6).

## Limited — transparency obligations

Users interact with AI or consume AI-generated content, but no significant automated
decision is made about them:

- Chatbots and assistants (users must know they're talking to AI)
- AI-generated or AI-modified content shown to users (label it)
- Emotion recognition / biometric categorization outside prohibited contexts (disclose)

Gate implications: 5.7 (disclosure) is the load-bearing check; 5.2 and 5.4 still apply.

## Minimal — standard gate, lighter answers

Everything else: internal copilots with human review, spam filters, code assistants,
recommendation of non-essential content. All seven checks still get answered — the
answers are just shorter.

## GPAI note

If you are *providing* a general-purpose model (not just calling one), additional
GPAI obligations apply (training-data summaries, model documentation). That is out of
scope for a feature spec; flag it to legal/compliance.

*This is an engineering classification aid, not legal advice. When the tier affects a
launch decision, confirm with counsel.*

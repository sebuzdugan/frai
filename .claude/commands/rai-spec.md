---
description: Write or review a spec with the Responsible AI Gate
---

Load and follow the `responsible-ai-spec` skill (skills/responsible-ai-spec/SKILL.md).

Task: $ARGUMENTS

- If the argument is a feature idea or description: classify its risk tier
  (skills/responsible-ai-spec/references/eu-ai-act-tiers.md), then write a spec from
  skills/responsible-ai-spec/templates/rai-spec-template.md with every Responsible AI
  Gate field answered concretely — ground the answers in this repository's actual code
  and data flows, and flag any field you cannot answer without a human decision.
- If the argument is a path to an existing spec: review it against
  skills/responsible-ai-spec/references/rai-gate-checklist.md and report a
  PASS / WARN / BLOCK verdict with the specific failing lines.
- If no argument: ask what feature to spec.

Remember the hard rule: high-risk tier requires a named human sign-off — never
self-approve it.

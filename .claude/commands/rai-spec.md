---
description: Write or review a spec with the FRAI Gate (Responsible AI Gate)
---

Follow the FRAI Gate workflow (canonical skill: github.com/sebuzdugan/frai-skills,
skill `responsible-ai-spec`; local template: packages/frai-gate/assets/rai-spec-template.md).

Task: $ARGUMENTS

- If the argument is a feature idea: classify its EU AI Act risk tier (prohibited / high /
  limited / minimal), then write a spec from the template with every FRAI Gate field
  answered concretely — seven checks: risk tier, data & privacy, human oversight,
  evaluation thresholds, bias & fairness, monitoring & rollback, transparency & incidents.
  Ground answers in this repository's actual code; every answer needs a number, a name,
  or a mechanism. Flag anything needing a human decision as "NEEDS HUMAN INPUT".
- If the argument is a path to an existing spec: run
  `node packages/frai-gate/dist/cli.js check <path>` and explain each finding with the
  specific fix.
- If no argument: ask what feature to spec.

Hard rule: high-risk tier requires a named human sign-off — never self-approve it.

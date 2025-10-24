# Fine-Tuning Governance Specification

This document captures the governance schema and readiness checks implemented in `frai-core` for the upcoming `frai-finetune` toolkit. The goal is to make fine-tuning workflows auditable, bias-aware, and production-safe by default.

## Schema Overview

The governance plan is represented as a JSON object with the following top-level sections:

| Section | Purpose | Key Fields |
| --- | --- | --- |
| `dataset` | Capture provenance, consent, and quality of the fine-tuning corpus. | `name`, `useCases`, `sources[]`, `sensitivity`, `retention`, `qualityChecks` |
| `training` | Describe the base model, objectives, and safety hooks. | `objective`, `baseModel`, `targetPersona`, `callbacks[]`, `safety.guardrails[]` |
| `evaluation` | Define regression suites and launch gates. | `datasets[]`, `metrics[]`, `gateCriteria.minimumSuccessRate`, `gateCriteria.riskTolerance` |
| `approvals` | Track stakeholders and sign-off status. | `stakeholders[].role`, `stakeholders[].name`, `stakeholders[].status` |
| `monitoring` | Prepare live telemetry and rollback plan. | `owner`, `metrics[]`, `telemetry`, `rollbackPlan.trigger`, `rollbackPlan.steps[]` |
| `audit` | Archive artefacts for compliance. | `artefacts[]`, `notes` |

### Enumerations
- `dataset.sensitivity.level`: `none`, `internal`, `confidential`, `restricted`
- `evaluation.gateCriteria.riskTolerance`: `low`, `medium`, `high`, `critical`
- `approvals.stakeholders[].status`: `pending`, `approved`, `rejected`

## Validation Rules

`frai-core/src/finetune/index.js` exposes `validateGovernancePlan(plan)` which returns `{ valid, errors }`. Key checks include:
- Required sections must be present and use the prescribed shape.
- Dataset sources require `name`, `type`, `access`, `owner`.
- Evaluation metrics require `name`, `direction`, and numeric `threshold`.
- Monitoring rollback steps must be non-empty strings.
- Stakeholder approvals must use an allowed status value.

## Readiness Scoring

`calculateReadiness(plan)` evaluates a plan across five checkpoints:

1. `dataset` – dataset use-cases, sources, and quality checks populated.
2. `evaluation` – metrics with thresholds and gate criteria.
3. `approvals` – every stakeholder marked as `approved`.
4. `monitoring` – named owner plus metrics and rollback steps.
5. `audit` – artefact references stored.

The function returns `{ status, score, checkpoints }` where:
- `status` is `ready`, `pending`, or `blocked` (`blocked` if approvals or evaluation are incomplete).
- `score` is the proportion of satisfied checkpoints.
- `checkpoints` details completion state per checkpoint.

`summarizeGovernance(plan)` provides a human-readable summary suitable for CLI output or reports.

## Example Configuration

```json
{
  "dataset": {
    "name": "Customer Support Conversations",
    "description": "Anonymised support dialogues from Q1 2024.",
    "useCases": ["Assist agents in answering live chats"],
    "sources": [
      {
        "name": "Zendesk export",
        "type": "csv",
        "access": "s3://frai-data/chat-trimmed.csv",
        "owner": "Support Ops"
      }
    ],
    "sensitivity": {
      "level": "confidential",
      "piiPresent": false,
      "mitigation": "PII scrubbed using internal tool"
    },
    "retention": {
      "policy": "Delete after 12 months",
      "reviewAt": "2025-06-01"
    },
    "qualityChecks": {
      "biasAssessment": "No skew observed across demographics",
      "dataBalanceSummary": "Balanced between positive/negative sentiment",
      "manualReview": "Sampled 200 records for offensive content"
    }
  },
  "training": {
    "objective": "Improve suggestion latency by 20%",
    "baseModel": "gpt-3.5-turbo",
    "targetPersona": "Customer support agent",
    "callbacks": ["biasAuditHook", "guardrailValidationHook"],
    "safety": {
      "guardrails": ["toxicity-filter", "pii-detector"],
      "escalationContacts": ["responsible-ai@frai.dev"]
    }
  },
  "evaluation": {
    "datasets": [
      {
        "name": "Zendesk hold-outs",
        "description": "10% holdout set for regression checks"
      }
    ],
    "metrics": [
      {
        "name": "Exact match",
        "direction": "increase",
        "threshold": 0.66
      },
      {
        "name": "Toxicity rate",
        "direction": "decrease",
        "threshold": 0.02
      }
    ],
    "gateCriteria": {
      "minimumSuccessRate": 0.65,
      "riskTolerance": "medium"
    }
  },
  "approvals": {
    "stakeholders": [
      {
        "role": "Responsible AI",
        "name": "Avery Rai",
        "status": "approved"
      },
      {
        "role": "Security",
        "name": "Chris Sec",
        "status": "approved"
      }
    ]
  },
  "monitoring": {
    "owner": "oncall-support",
    "metrics": [
      {
        "name": "Latency p95",
        "alertCondition": "above 1.5s for 10m",
        "owner": "ml-oncall"
      }
    ],
    "telemetry": {
      "storage": "datadog::frai-finetune",
      "retentionDays": 90
    },
    "rollbackPlan": {
      "trigger": "Any sev1 incident or approval revocation",
      "steps": [
        "Disable fine-tuned model",
        "Revert to base model",
        "Notify stakeholders"
      ]
    }
  },
  "audit": {
    "artefacts": ["s3://frai-artifacts/fine-tune/run-42"],
    "notes": "Review scheduled with governance board on 2024-05-12."
  }
}
```

## Next Steps
- Expose CLI helpers to initialise a governance template and validate JSON files.
- Integrate readiness scoring into `frai eval` and future dashboard surfaces.
- Link artefact storage to `frai-core` document generation for unified audit bundles.

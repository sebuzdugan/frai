# support-triage demo — the Responsible AI Gate, end to end

The exact project from the frai-gate demo video. An Express service where an LLM
triages support tickets and P1s page on-call.

Reproduce the flow:

```bash
npx frai-gate init                 # scaffold the spec template
npx frai-gate check FRAI-SPEC.md    # BLOCK: empty answers fail (exit 1)
npx frai-gate draft                # a read-only agent drafts the gate FROM this code
npx frai-gate check FRAI-SPEC.md --smart   # adversarial review of spec vs code
```

What the pipeline caught on the ORIGINAL version of this code (see
`rai-gate-draft.reference.md` for the full agent draft):

- customer `name` + `email` interpolated into the OpenAI prompt for no reason
- model output auto-paging on-call with no human review and no output validation
- no kill switch, no eval harness, prompt-injection surface on free text

`src/` contains the FIXED version (message-only payload, enum validation,
`TRIAGE_MODE` kill switch). `FRAI-SPEC.md` is the completed spec that PASSes the
deterministic check — and the `--smart` review still finds honest gaps in it,
which is the point.

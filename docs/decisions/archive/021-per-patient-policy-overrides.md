# Per-Patient Policy Overrides (Tighten-Only)

## Decision

Add a per-patient layer on top of the global escalation taxonomy ([ADR 001](001-escalation-taxonomy.md)) that lets a concierge make Eve **more** cautious for a specific patient — and never less. An override can force a normally-autonomous category (e.g. `travel_logistics`) to escalate for one patient, or raise a flag's level from `Med` to `High`. It can never make a category autonomous or lower a level. This is the tighten-only invariant, enforced in one pure resolver so it is impossible to misconfigure from any surface.

Before this, "per-patient access" was effectively a property of per-document `answer_policy` ([ADR 002](002-care-instructions-source-of-truth.md)) plus the global taxonomy; there was no per-category patient control. This ADR makes that control real and explicit.

## Why

Patients differ. A high-anxiety patient, a complex case, or a VIP on a high-touch plan may warrant escalating categories Eve would normally handle alone. But loosening a clinical guardrail per patient is dangerous, so the feature is asymmetric by construction: the global policy is the conservative floor, and overrides can only raise the bar. Encoding that as a clamp in the resolver (not as UI discipline) means no dashboard bug or bad data can ever make Eve answer something the global rules say to escalate.

## Design

- **Resolver** ([shared/src/taxonomy.ts](../../../shared/src/taxonomy.ts)): `PatientPolicyOverride` (`{ category, force_escalate?, level? }`) and `resolvePatientPolicy(category, overrides)`. The resolver applies overrides but clamps: it never sets `autonomous: true` and never lowers a level (`higherLevel` only raises). `sanitizePolicyOverrides` drops no-op/loosening/invalid entries so only real tightenings persist, and `summarizePolicyOverrides` renders a compact line for the agent context. Unit-tested in [shared/src/taxonomy.test.ts](../../../shared/src/taxonomy.test.ts) including the two no-loosening invariants.
- **Storage** ([convex/schema.ts](../../../convex/schema.ts)): an optional `policy_overrides` array on the `patients` table, threaded through `upsertPatient` ([convex/mutations.ts](../../../convex/mutations.ts)) and the `Patient` type ([shared/src/types.ts](../../../shared/src/types.ts)). No migration framework — applied via `pnpm seed:reset` (data is notional).
- **Agent** reads it: the transport injects a `policy_overrides:` line into the trusted `<<ESSOS_CONTEXT>>` header ([transport/src/context.ts](../../../transport/src/context.ts), mirrored in [eve-concierge/evals/context.ts](../../../eve-concierge/evals/context.ts)), and [instructions.md](../../../eve-concierge/agent/instructions.md) tells Eve to treat listed categories as must-escalate for that patient. Per-document `answer_policy` still governs documents; this adds the per-category patient layer.
- **Dashboard** ([dashboard/features/patients/policy-control.tsx](../../../dashboard/features/patients/policy-control.tsx)): a per-category editor inside the patient profile. Autonomous categories get an "Always escalate" toggle (+ level); already-escalating `Med` categories can be raised to `High`; already-`High` clinical categories render locked. Each row shows the effective behavior computed via `resolvePatientPolicy`, so the concierge sees exactly what Eve will do.

## Consequences / trade-offs

- The clamp is the safety property: any attempt to loosen is silently dropped by `sanitizePolicyOverrides` and ignored by `resolvePatientPolicy`. The dashboard never even offers a loosening control.
- Overrides are stored per patient; the machine path reads them with the rest of the patient record, so no extra round-trip.
- The transport re-sanitizes at read time, so even hand-edited/seeded data can't push junk into the prompt.
- Per-document `answer_policy` remains the right tool for "can Eve quote this specific document"; policy overrides are the right tool for "treat this whole category more cautiously for this patient." They compose.

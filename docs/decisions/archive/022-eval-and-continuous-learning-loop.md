# Eval and Continuous-Learning Loop

## Decision

Close the loop between what Eve does in production and how the suite measures it, using the eve framework's built-in eval engine plus three cheap, durable signals — without adding fine-tuning, RLHF, or an external eval platform. Concretely:

1. **Category on every turn.** Populate `agent_turns.category` (the column existed but was never written) so telemetry can be sliced by taxonomy category.
2. **Escalation-validity label.** A human "was this escalation necessary?" verdict on each flag — the gold label that turns over-escalation from a vibe into a number.
3. **LLM-as-judge in the eval suite.** Soft quality assertions (groundedness, no-medical-advice) on top of the existing deterministic tool-routing gates, gated under `--strict`, run in CI.
4. **Production → eval flywheel.** A generator that turns a mishandled escalation into a regression eval case, plus a draft-edit-distance signal for draft quality.

## Why

The observability foundations were already strong (the `agent_turns` table, the taxonomy, a working `eve eval` harness, a metrics dashboard), but the loop was open: no quality/correctness signal, no human feedback, `category` unwritten, and nothing feeding real outcomes back into evals. At low volume the right-sized, modern answer is judge + a human validity label + a growing regression set — not a model-training pipeline.

## Design

- **Category telemetry** ([transport/src/core.ts](../../../transport/src/core.ts)): `inferCategory` derives the category for autonomous turns from the tool used (e.g. `get_itinerary` → `itinerary_reference`) and takes it from the escalation's `reason` for escalated turns. Surfaced as a per-category breakdown in `aiPerformance` ([convex/queries.ts](../../../convex/queries.ts)) and the AI-performance view.
- **Escalation validity** ([convex/schema.ts](../../../convex/schema.ts), [convex/model/escalations.ts](../../../convex/model/escalations.ts)): `feedback_valid`/`feedback_note`/`feedback_by`/`feedback_at` on `escalations`, set by `setEscalationFeedback` (dashboard, [convex/mutations.ts](../../../convex/mutations.ts)) and `setEscalationFeedbackFromSlack` (Slack). Decoupled from resolve so a concierge can label a flag any time. Captured in the dashboard flags panel ([dashboard/features/conversations/escalation-feedback.tsx](../../../dashboard/features/conversations/escalation-feedback.tsx)) and via Slack buttons; surfaced as the validity rate in AI performance.
- **Draft-edit-distance** ([convex/lib/util.ts](../../../convex/lib/util.ts) `normalizedEditDistance`; [shared/src/text.ts](../../../shared/src/text.ts) for non-Convex callers): when a concierge sends a reply that started from Eve's draft, store the normalized edit distance between the draft and the sent text on the escalation (`recordDraftEdit`). A low average means drafts are good enough to send nearly as-is.
- **LLM-as-judge** ([eve-concierge/evals/evals.config.ts](../../../eve-concierge/evals/evals.config.ts)): the judge routes directly to Anthropic (an AI SDK model instance, not a gateway string id), consistent with the ZDR posture in [ADR 006](006-model-routing-direct-anthropic.md). Soft `closedQA` assertions on a few evals check groundedness and the no-medical-advice guardrail; they fail only under `--strict`, so the deterministic suite stays green without a judge.
- **CI gate** ([.github/workflows/evals.yml](../../../.github/workflows/evals.yml)): runs `eve eval --strict --junit` against a seeded eval deployment, opt-in via the `RUN_EVALS` repo variable so PRs stay green until the eval secrets are configured.
- **Production → eval flywheel** ([scripts/eval-from-escalation.ts](../../../scripts/eval-from-escalation.ts)): `pnpm eval:from-escalation <id>` reads a real escalation + its triggering message and writes `eve-concierge/evals/regressions/<slug>.eval.ts`, inferring the expected behavior (an over-escalation marked unnecessary becomes an "expect autonomous" case). A human reviews and commits it, so each real mistake becomes a permanent regression test.

## Consequences / trade-offs

- Category inference for autonomous turns is a tool-based heuristic (documented in code); explicit per-turn classification is a later option if the heuristic proves too coarse.
- The validity label is the highest-leverage addition: it makes "Eve over-escalates category X" measurable per category and is the trigger to loosen a category or expand what Eve can answer.
- Judge assertions burn tokens, so they are few and soft; the deterministic tool-routing gates remain the primary signal.
- The flywheel generator writes a draft case for human review rather than committing automatically — the human decides what Eve *should* have done.

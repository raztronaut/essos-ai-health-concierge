import { anthropic } from "@ai-sdk/anthropic";
import { defineEvalConfig } from "eve/evals";

/**
 * Defaults for the Essos concierge eval suite.
 *
 * Tool-routing assertions (autonomous answer vs escalation) are deterministic
 * gates and need no model. On top of those, a few evals add soft LLM-as-judge
 * checks for the things tool calls can't prove — groundedness and the
 * "no medical advice" guardrail. Those only fail the run under
 * `eve eval --strict`, so the deterministic suite stays green without judging.
 *
 * The judge routes DIRECTLY to Anthropic (an AI SDK model instance, not a
 * gateway string id) so it inherits the same zero-data-retention posture as the
 * agent and PHI never transits a third-party gateway (ADR 006/022). With no
 * `ANTHROPIC_API_KEY` present, judge-backed assertions skip visibly rather than
 * failing the run. Run with `pnpm exec eve eval` after `pnpm seed:reset`.
 */
export default defineEvalConfig({
  judge: {
    model: anthropic(process.env.ESSOS_JUDGE_MODEL ?? "claude-sonnet-4-5"),
  },
});

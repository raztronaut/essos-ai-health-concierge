import { defineEvalConfig } from "eve/evals";

/**
 * Defaults for the Essos concierge eval suite.
 *
 * The suite is fully deterministic — it asserts on run completion and which
 * tools Eve called (autonomous answer vs escalation), not on fuzzy reply text —
 * so no LLM judge model is configured. Run with `pnpm exec eve eval` after
 * `pnpm seed:reset` and with `ANTHROPIC_API_KEY` set.
 */
export default defineEvalConfig({});

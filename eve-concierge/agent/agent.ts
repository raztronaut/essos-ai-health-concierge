import { anthropic } from "@ai-sdk/anthropic";
import { defineAgent } from "eve";

/**
 * The Essos concierge agent.
 *
 * Routes DIRECTLY to Anthropic (via @ai-sdk/anthropic) rather than the Vercel
 * AI Gateway, so the work-trial zero-data-retention `ANTHROPIC_API_KEY` is used
 * as-is and PHI never transits a third-party gateway. `ESSOS_AGENT_MODEL` is the
 * Anthropic model id (e.g. "claude-sonnet-4-5").
 */
export default defineAgent({
  model: anthropic(process.env.ESSOS_AGENT_MODEL ?? "claude-sonnet-4-5"),
});

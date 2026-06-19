import { disableTool } from "eve/tools";

/**
 * Disable the provider-managed web_search built-in. The concierge answers from
 * its own sources of truth (itinerary, documented care instructions, Google
 * Places via search_local_places) and must not free-search the web. It also
 * requires an Anthropic org entitlement we don't rely on for the work trial.
 */
export default disableTool();

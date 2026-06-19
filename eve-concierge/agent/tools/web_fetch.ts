import { disableTool } from "eve/tools";

/**
 * `web_fetch` runs in the app runtime with full `process.env` access, so a
 * prompt-injection payload in patient text could exfiltrate secrets to an
 * arbitrary URL. The concierge answers only from its own sources, so disable it.
 * See ADR 006 and the Essos security posture in the README.
 */
export default disableTool();

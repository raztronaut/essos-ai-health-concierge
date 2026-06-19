import { disableTool } from "eve/tools";

/**
 * No filesystem discovery for a patient-facing concierge. Disable built-in `glob`.
 */
export default disableTool();

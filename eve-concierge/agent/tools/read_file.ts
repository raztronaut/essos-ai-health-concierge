import { disableTool } from "eve/tools";

/**
 * A patient-facing concierge has no reason to read the sandbox filesystem, and
 * untrusted input must not be able to drive it. Disable built-in `read_file`.
 */
export default disableTool();

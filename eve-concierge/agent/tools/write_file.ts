import { disableTool } from "eve/tools";

/**
 * The concierge never writes files; all state goes through the typed @essos/shared
 * repo tools. Disable built-in `write_file` so untrusted input cannot drive it.
 */
export default disableTool();

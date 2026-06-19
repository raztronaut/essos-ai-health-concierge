import { disableTool } from "eve/tools";

/**
 * The concierge ingests untrusted patient free-text, so the model must never be
 * able to run shell commands. Disable the built-in `bash` tool. See ADR 006.
 */
export default disableTool();

# Agent Hardening and Transport Auth

## Decision

The patient-facing Eve agent is hardened against untrusted input, and the transport authenticates to Eve's HTTP session API with a shared secret. Concretely:

1. **Disable dangerous built-in tools.** Eve's default harness ships `bash`, `read_file`, `write_file`, `glob`, `grep`, `web_fetch`, and `web_search`. Each is removed with a `disableTool()` sentinel file under `eve-concierge/agent/tools/` named after the tool slug.
2. **Real route auth.** `agent/channels/eve.ts` uses `[localDev(), transportSecret()]` instead of the `eve init` `placeholderAuth()` scaffold. `transportSecret()` is a custom `AuthFn` that accepts `Authorization: Bearer $ESSOS_TRANSPORT_SECRET` (timing-safe compare) and otherwise skips, failing closed to a 401.
3. **PII minimization on tool output.** `get_itinerary` declares an `outputSchema` and omits null fields so only present itinerary data (and no empty PII placeholders) reaches the model context.
4. **Constrain escalation categories.** `escalate_to_human`'s `reason` enum is built from `ESCALATABLE_CATEGORIES` (the must-escalate categories plus `travel_logistics`), so an escalation can never cite an autonomous-only reference category.

## Why

The agent reads untrusted patient free-text after the trusted `<<ESSOS_CONTEXT>>` block. The Eve docs (`concepts/default-harness.md`) are explicit: "Disable, wrap, restrict, or require approval for any tool that can access the filesystem, network, shell, or sensitive data." `web_fetch` in particular runs in the app runtime with full `process.env`, so a prompt-injection payload could exfiltrate `ANTHROPIC_API_KEY`/`GOOGLE_PLACES_API_KEY` to an attacker URL. Disabling the unused built-ins removes that surface entirely.

`placeholderAuth()` returns a setup-focused 401 in production, so a deployed (non-loopback) agent would reject the transport. The transport is the only client, so a shared-secret bearer is the simplest correct policy; `localDev()` keeps zero-config local development working over loopback.

## Trust model

- **Local dev:** the transport calls Eve over `127.0.0.1`; `localDev()` admits it. `ESSOS_TRANSPORT_SECRET` can be unset.
- **Deployed / non-loopback:** set the same `ESSOS_TRANSPORT_SECRET` on both the transport and Eve. The transport sends it as a bearer ([transport/src/eveClient.ts](../../../transport/src/eveClient.ts)); Eve verifies it ([eve-concierge/agent/channels/eve.ts](../../../eve-concierge/agent/channels/eve.ts)).
- `localDev()` trusts the advertised hostname, so always front a deployed agent with a normalizing proxy and rely on the secret, never on `localDev()` alone.

## Evals

`eve-concierge/evals/` holds a deterministic suite (wired via the `#evals/*` subpath import) covering the six demo scenarios, so a prompt or tool change that breaks the autonomous-vs-escalate behavior is caught by `eve eval`.

## Consequences

- `ESSOS_TRANSPORT_SECRET` is a new optional env var ([.env.example](../../../.env.example)).
- Disabling a built-in by filename fails the build if the filename matches no known tool, so a typo surfaces immediately rather than silently removing the wrong tool.
- PII hardening remains a broader later-focus (the dashboard and DB still hold notional PII); this ADR covers the agent's model-facing surface only.

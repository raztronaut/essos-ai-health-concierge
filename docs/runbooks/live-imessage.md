# Live iMessage runbook

Run Essos against a real Spectrum Cloud iMessage line. For local-only development see [local-development.md](local-development.md); for cloud deploys see [deploy.md](deploy.md).

## Bring up the line

1. Provision a Spectrum Cloud iMessage line (app.photon.codes); set `SPECTRUM_PROJECT_ID`/`SPECTRUM_PROJECT_SECRET` in `.env`.
2. For reviewer testing, keep `ESSOS_GUEST_MODE=1`: the first message from an unknown reviewer handle creates an isolated demo patient cloned from the guest template, so reviewers do not need phone pre-binding.
3. If testing with a known patient instead, bind a number by editing a patient `handle` in `mock-assets/patients/*.json` to the patient device's iMessage handle (E.164 phone or Apple ID email), then `pnpm seed:reset`.
4. Set `ESSOS_CONCIERGE_HANDLES` (comma-separated) to the concierge participants' real handles (not display names) so their messages don't trigger Eve and signal takeover.
5. Use `ESSOS_MINIAPP_DELIVERY=spectrum_app` for the new Spectrum Mini App card path. The card opens `ESSOS_PATIENT_MINIAPP_BASE_URL` (current reviewer prod: `https://patient-miniapp.vercel.app`; switch to `https://mini.essos.dev` after DNS is attached) and falls back to a plain link if iMessage cannot render the card.
6. Create the group chat containing the patient device, the concierge device, and the Spectrum agent line.
7. `pnpm demo` (starts convex + eve + dashboard + supervised transport together), then text from the patient device. To run the pieces separately instead: `pnpm eve:dev`, `pnpm transport:imessage`, `pnpm dashboard:dev`.

`pnpm eve:dev` serves Eve's HTTP API on `:3000` (the port the transport's `EVE_BASE_URL` defaults to); use `pnpm eve:tui` for the interactive console instead. To run Eve on a different port, set `EVE_BASE_URL` for the transport to match. Restart `eve:dev` after changing `@essos/shared` or an agent tool — the dev server snapshots them at startup.

For an unattended demo, run `pnpm transport:imessage:supervised` instead of `pnpm transport:imessage`: it restarts the worker on crash and, with `ESSOS_TRANSPORT_HEALTH_PORT` set, exposes `GET /healthz`. A single-instance lock prevents two transports from fighting over the one Spectrum stream.

Eve and the transport here run on the same host, so Eve's `localDev()` route auth admits the transport with no extra config. If you deploy Eve to a non-loopback host, set the same `ESSOS_TRANSPORT_SECRET` on both so the transport authenticates ([ADR 009](../decisions/archive/009-agent-hardening-and-transport-auth.md)).

See [ADR 008](../decisions/archive/008-transport-eve-streaming-contract.md) for the transport/streaming details.

## Let reviewers chat with Eve (guest mode)

So anyone can test the live agent without you binding their phone number to a patient, the transport supports **guest onboarding**: set `ESSOS_GUEST_MODE=1` and the first time an unknown handle texts the Spectrum line, a demo patient is auto-created for them (cloned from a template patient — `ESSOS_GUEST_TEMPLATE`, default `pat_maya` — so Eve has a real itinerary + care plan to answer from). Each guest is an isolated conversation in the dashboard; disclosure, grounded answers, escalation, and handoff all work. Just share the number: "text +1XXX to try the Essos concierge." Clear guests later with `pnpm seed:reset` (dev) or by pruning `pat_guest_*` ids. See [ADR 017](../decisions/archive/017-guest-onboarding-and-deployment.md).

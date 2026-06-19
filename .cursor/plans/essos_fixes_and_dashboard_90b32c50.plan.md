---
name: Essos fixes and dashboard
overview: Fix the small consistency bugs (demo patient ID, model slug, PDF path), do first-run setup (.env + seed), then build the missing Next.js admin dashboard (Phase 4) so the system runs end-to-end.
todos:
  - id: fix-ids
    content: Fix demo patient ID (pat_amira->pat_maya) in transport/src/env.ts and .env.example; standardize model slug to anthropic/claude-sonnet-4-5 in agent.ts; rebuild eve manifest
    status: completed
  - id: fix-pdf-path
    content: Repoint manifest.json + generate_pdfs.py from output/pdf/essos to mock-assets/pdf/essos and refresh sha256 values
    status: completed
  - id: first-run
    content: Create .env from .env.example, build shared, run pnpm seed:reset to populate .data/essos.db
    status: completed
  - id: dashboard-scaffold
    content: Scaffold Next.js App Router @essos/dashboard package (Tailwind + branding tokens), wired to @essos/shared and workspace
    status: completed
  - id: dashboard-views
    content: Build conversations, escalation/flag queue (resolve/take-over/resume server actions), patient+itinerary viewer, and agent telemetry views
    status: completed
  - id: verify
    content: Typecheck all packages, build dashboard, and smoke-test end-to-end (eve dev + transport terminal + dashboard flag surfacing)
    status: completed
isProject: false
---

## Essos Concierge — Remediation + Dashboard

The backend trio (`shared` + `agent` + `transport`) is complete and type-clean. This plan closes the gaps: three consistency fixes, first-run setup, and the missing dashboard.

### 1. Fix consistency bugs

- **Demo patient ID.** In [transport/src/env.ts](transport/src/env.ts) change the `DEMO_PATIENT` default `"pat_amira"` -> `"pat_maya"`. In [.env.example](.env.example) update line 18-19 (`ESSOS_DEMO_PATIENT` default + comment) to `pat_maya | pat_diego | pat_sofia`.
- **Model slug.** [agent/agent.ts](agent/agent.ts) defaults to `anthropic/claude-sonnet-4.6` (invalid dotted slug); `.env.example` says `claude-sonnet-4-5`. Standardize both on a valid slug (`anthropic/claude-sonnet-4-5`), then `cd agent && pnpm exec eve build` to refresh the compiled manifest.
- **PDF path.** PDFs now live at `mock-assets/pdf/essos/` but [mock-assets/manifest.json](mock-assets/manifest.json) (`output_dir` + every `pdf_path`) and [generate_pdfs.py](mock-assets/scripts/generate_pdfs.py) (`OUT_DIR`) point at `output/pdf/essos/`. Repoint both to `mock-assets/pdf/essos`, and refresh the manifest `sha256` values for the current files so seeded `pdf_path`s resolve.

### 2. First-run setup

- Create `.env` from `.env.example` (gitignored), filling the ZDR `ANTHROPIC_API_KEY` / `AI_GATEWAY_API_KEY`.
- `pnpm --filter @essos/shared run build` then `pnpm seed:reset` to create `.data/essos.db` (3 patients, source docs, itinerary, care docs, the pre-seeded Sofia "stranded at arrivals" escalation).

### 3. Build the dashboard (`dashboard/`, `@essos/dashboard`)

Next.js App Router + TypeScript + Tailwind, Node runtime (server components read the shared SQLite directly via `@essos/shared` repo helpers; no separate API). Styled from `.essos_branding` tokens. Root scripts already expect `pnpm --filter @essos/dashboard run dev`; add it as a `pnpm-workspace.yaml` member (already listed) and depend on `@essos/shared` via `workspace:*`.

Views (the "single pane of glass"):
- **Conversations** — list (most-recent first via `listConversations`) + thread view (`listMessages`), patient/automation-state badges.
- **Escalation / flag queue** — `listEscalations("open")`, High/Med + reason + summary, jump-to-conversation, and server actions for `resolveEscalation`, `takeOverEscalation` / `markConciergeTakeover`, and `resumeAutomation` (then `revalidatePath`).
- **Patient + itinerary viewer** — `listItinerary` timeline, `listCareInstructions` with `source_status` / `answer_policy`, and `listSourceDocumentsForPatient` linking to the PDFs under `mock-assets/pdf/essos/`.
- **Agent telemetry** — counts from `listAllActivity` / `activity_log`: turns handled autonomously vs escalated, paused/taken-over/resolved.

### 4. Verify end-to-end

- `pnpm -r run typecheck` (shared, transport, dashboard) + `cd agent && pnpm run typecheck`.
- `pnpm --filter @essos/dashboard run build`.
- Smoke: `cd agent && pnpm exec eve dev --no-ui --port 3000`, then `pnpm transport:terminal`, run a couple canonical prompts (itinerary lookup, pre-op reference, a medical escalation) and confirm the flag surfaces in the dashboard with resolve/take-over working.

### Notes / assumptions
- Node engine: agent wants 24.x, you're on v25.4.0 (source of the earlier `eza`/`ls` shell hangs). Non-blocking; flag only.
- Dashboard reads the DB directly (read-mostly admin tool) rather than adding an API layer, matching the local-first MVP architecture in the plan.

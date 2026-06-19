---
name: Dashboard React/Next Audit
overview: A thorough React 19 / Next.js 16 best-practices audit of the `dashboard/` app, with prioritized, concrete improvements across performance (re-renders, bundle, waterfalls), correctness/security (route handlers), and cleanup.
todos:
  - id: p1-context
    content: Stabilize DemoContext value in demo-identity.tsx by memoizing concierges projection so the whole-app context value stops re-rendering every render
    status: completed
  - id: p2-escalation
    content: Memoize patientsById Map + sorted queue in escalation-queue.tsx and pass `now` as a prop instead of Date.now() in render
    status: completed
  - id: p3-bundle
    content: Add experimental.optimizePackageImports for @/components/ui and motion in next.config.mjs; dynamically import BorderBeam and StaggerList
    status: completed
  - id: p4-waterfall
    content: Collapse conversation->patient waterfall in conversation-detail-view.tsx into a single Convex query
    status: completed
  - id: p5-derived
    content: Replace defaultName sync effect in concierge-reply-box.tsx with computed value or key-based reset
    status: completed
  - id: p6-routes
    content: Harden api/webhooks/route.ts (check fetch response.ok, fail on missing secret/URL in prod) and review auth on source-docs/[id]/route.ts
    status: completed
  - id: p7-cleanup
    content: "Minor cleanups: hoist inline useDemoIdentity() in patient-form-dialog.tsx, stable empty-array props, verify aria-expanded on fold-trigger"
    status: completed
isProject: false
---

# Dashboard React / Next.js Audit

Audited the `dashboard/` Next.js 16 + React 19 + Convex + Clerk app against the Vercel React and Next best-practices skills. Overall the codebase is clean: good server/client split, correct async `params`, idiomatic `cn()` (clsx + tailwind-merge), Tailwind v4 CSS-first config, no `<img>` misuse, solid accessibility, and well-memoized hooks like [use-patient-roster.ts](dashboard/features/patients/use-patient-roster.ts). The findings below are the meaningful improvements, ordered by impact.

## P1 - App-wide re-render storm (highest impact)

In [demo-identity.tsx](dashboard/features/demo/demo-identity.tsx) the `Inner` provider wraps the whole app, but `concierges` is rebuilt as a new array every render (lines 107-113), which busts the `useMemo` at line 135 (it's in the dep array). So the context `value` gets a fresh reference on every render, re-rendering **every** `DemoContext` consumer (i.e. nearly the entire tree).

- Move the `.map()` projection inside the `useMemo`, or wrap it in its own `useMemo` keyed on the raw query result, so `value` is stable.
- This is `rerender-derived-state-no-effect` + stable-context-value.

## P2 - Render-time work and `Date.now()` in render

[escalation-queue.tsx](dashboard/features/overview/escalation-queue.tsx) lines 21-24 rebuild a `Map`, re-sort the queue, and call `Date.now()` on every render.
- Memoize `patientsById` and the sorted `queue`.
- Pass `now` as a prop (or compute once) instead of calling `Date.now()` in render to keep rendering deterministic.

## P3 - Bundle: barrel imports + eager `motion`

- `dashboard/components/ui/index.ts` re-exports all 22 components; ~34 files import from the `@/components/ui` barrel. The barrel transitively pulls `motion` (via [dialog.tsx](dashboard/components/ui/dialog.tsx)) and `torph` (via [stat.tsx](dashboard/components/ui/stat.tsx)), so importing a `Badge` can drag animation libs into a chunk.
- Add `experimental.optimizePackageImports: ["@/components/ui"]` (and `motion`) to [next.config.mjs](dashboard/next.config.mjs), which currently only sets `outputFileTracingRoot`.
- `motion` v12 is statically imported in 5 places including the layout-level [nav-link.tsx](dashboard/components/layout/nav-link.tsx), so it likely loads on every route. Decorative-only [border-beam.tsx](dashboard/components/motion/border-beam.tsx) and [stagger-list.tsx](dashboard/components/motion/stagger-list.tsx) (both early-return under `useReducedMotion`) are good `next/dynamic` candidates.

## P4 - Data-fetching waterfall

[conversation-detail-view.tsx](dashboard/features/conversations/conversation-detail-view.tsx) lines 19-23 gate `getPatient` on `getConversation` via `"skip"`, creating a sequential round-trip. Collapse into a single Convex query returning conversation + patient together (`async-parallel`). [patient-detail-view.tsx](dashboard/features/patients/patient-detail-view.tsx) issues 6 parallel `useQuery` subscriptions - acceptable, but a consolidated detail query would reduce churn.

## P5 - Derived-state-via-effect

[concierge-reply-box.tsx](dashboard/features/conversations/concierge-reply-box.tsx) lines 47-51 mirror `defaultName` into state through an effect + `nameTouched` ref, causing an extra render. Replace with a computed value or a `key`-based reset.

## P6 - Route handler correctness / security

- [api/webhooks/route.ts](dashboard/app/api/webhooks/route.ts): the `machine()` helper (lines 10-28) never checks `fetch` `response.ok`, so a failed Convex sync still returns 200 and Clerk won't retry. Also silently no-ops when `CONVEX_SERVICE_SECRET` is unset, and falls back to `http://127.0.0.1:3211` in prod. Add response-status checks (throw -> 500 so Clerk retries), and fail loudly if the secret/URL is missing in production.
- [source-docs/[id]/route.ts](dashboard/app/source-docs/[id]/route.ts): no auth on a document-serving endpoint that reads arbitrary `doc.pdf_path`/`markdown_path` from disk. Confirm paths are trusted (seeded only) and consider an auth check; the disk read also makes the route Node-runtime-coupled.

## P7 - Minor cleanups

- [patient-form-dialog.tsx](dashboard/features/patients/patient-form-dialog.tsx) line 182 calls `useDemoIdentity()` inline inside JSX; hoist to one `const { concierges }` at the top.
- Numerous `prop={value ?? []}` fallbacks (e.g. [overview-view.tsx](dashboard/features/overview/overview-view.tsx) lines 27-28) create fresh arrays each render - harmless today but will silently bust any future `React.memo` on children. Worth a shared stable-empty-array const if children get memoized.
- Verify [fold-trigger.tsx](dashboard/components/ui/fold-trigger.tsx) sets `aria-expanded` on its toggle button.

## Suggested sequencing
1. P1 + P2 (cheap, high-impact re-render fixes)
2. P6 (webhook reliability/security)
3. P3 (next.config + dynamic motion)
4. P4 + P5 (query consolidation)
5. P7 (cleanups)

No framework version, dependency, or architecture changes are recommended - the stack (Next 16, React 19, Tailwind v4, Convex, Clerk) is current and well-used.
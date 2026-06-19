---
name: Add Biome Ultracite
overview: Add Biome (via the Ultracite preset) as the repo's linter/formatter with a single loose root config, scoped to the main workspaces (dashboard, transport, shared) plus root convex/scripts, and excluding the isolated eve-concierge sub-project and the vendored eve skill.
todos:
  - id: deps
    content: Add @biomejs/biome and ultracite to root devDependencies
    status: completed
  - id: config
    content: Create loosened root biome.jsonc with proper includes/ignores
    status: completed
  - id: scripts
    content: Add lint and format scripts to root package.json
    status: completed
  - id: format
    content: Run biome check --write across in-scope files (separate commit)
    status: completed
  - id: cleanup
    content: Triage remaining warnings; quick-fix or relax specific rules
    status: completed
isProject: false
---

# Add Biome/Ultracite (loose config)

Add Biome as a fast single-binary linter/formatter using the Ultracite preset, configured permissively so it lands without a big cleanup. Scope it to the main code and exclude isolated/vendored areas.

## Scope

In scope for linting/formatting:
- `dashboard/` (Next.js + React)
- `transport/`
- `shared/`
- root `convex/` (hand-written only) and `scripts/`

Excluded:
- `.agents/skills/eve/` (vendored eve framework, own oxlint/oxfmt toolchain)
- `eve-concierge/` (isolated sub-project, separate lockfile, uses tsgo)
- Generated/build output: `convex/_generated/`, `dashboard/.next/`, `**/dist/`, `node_modules/`, `mock-assets/`

## Steps

1. Add `@biomejs/biome` and `ultracite` as root `devDependencies` in [package.json](package.json).
2. Create root `biome.jsonc` extending Ultracite but loosened:
   - `files.includes` / `files.ignore` set to the scope above.
   - Downgrade the noisy strict rules to warnings (or off) for now, e.g. `noExplicitAny`, `noNonNullAssertion`, and the stricter a11y/correctness rules — so the first run is mostly clean.
   - Keep formatter + import sorting + safe correctness rules on.
3. Add root scripts to [package.json](package.json):
   - `"lint": "biome check ."`
   - `"format": "biome check --write ."`
4. Run `biome check --write .` once to apply formatting/import-sort. Land this as a separate mechanical commit so the formatting diff is isolated from any logic changes.
5. Review remaining warnings and either quick-fix or relax the specific rule; nothing should block.

## Notes / decisions taken

- Single root config (simplest for a repo this size) rather than per-workspace.
- `eve-concierge` intentionally left on its own eve toolchain.
- No CI/pre-commit hook in this pass (can add later); keeping it loose and manual for now.

## Verification

- `pnpm lint` runs clean (warnings allowed, no errors).
- `pnpm typecheck` still passes.
- Formatting diff is confined to in-scope files only.
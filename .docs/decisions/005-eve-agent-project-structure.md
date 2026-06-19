# Eve Agent Project Structure

## Decision

The Eve agent lives in a dedicated, clearly named directory, `eve-concierge/`, using Eve's **nested layout** (the app root is separate from the authored surface). The authored "brain" lives under `eve-concierge/agent/` (`agent.ts`, `instructions.md`, `channels/`, `tools/`, `skills/`). The agent is an **isolated sub-project**: it has its own `package.json` and `pnpm-lock.yaml`, is intentionally excluded from the root pnpm workspace, and depends on `@essos/shared` via a `link:` dependency.

## Why this layout

Eve determines its *app root* by walking up the filesystem to the nearest directory that contains an `agent/` folder. The original project used a flat layout in a directory literally named `agent/` (`agent/agent.ts`, `agent/tools/`, plus its own `package.json` and `node_modules`) sitting directly under the repo root.

Because the **repo root** contained a folder named `agent/`, Eve resolved the repo root as the app root and treated `agent/` as merely its authored surface. It then wrote `.eve/` to the repo root and resolved the `eve` package from the **repo-root** `node_modules` — which does not contain it (the agent's dependencies are isolated in `agent/node_modules`). `eve build` succeeded because it bundles dependencies, but `eve dev` failed at runtime with `Cannot find package 'eve'`.

Renaming to `eve-concierge/` with the authored surface nested in `eve-concierge/agent/` fixes this: running from `eve-concierge/`, Eve finds `agent/` directly inside it, resolves `appRoot = eve-concierge`, and resolves `eve` from `eve-concierge/node_modules`. The rename also removes the `agent/` naming ambiguity that made the codebase harder to reason about (a top-level folder named for the role, with Eve's conventional `agent/` authored slot nested inside).

## Structure

```
eve-concierge/            Eve app root (package.json, node_modules, .eve/, .output/)
├── package.json          name: essos-eve-concierge; deps: eve, ai, @ai-sdk/anthropic, zod, @essos/shared (link:)
├── pnpm-lock.yaml        own lockfile (isolated install)
├── pnpm-workspace.yaml   own workspace markers / pinned beta deps
├── tsconfig.json         include: agent/**/*.ts
├── .env -> ../.env       symlink so Eve loads env from its app root
└── agent/                authored surface (Eve convention)
    ├── agent.ts          model config (defineAgent)
    ├── instructions.md   persona + escalation policy
    ├── channels/eve.ts   HTTP session API
    ├── tools/            7 tools
    └── skills/           4 skills
```

## Isolation rationale

- The agent pins beta dependencies (`ai`, `nitro`) that would otherwise cause hoisting conflicts with the rest of the workspace, so it keeps its own lockfile and is excluded from the root `pnpm-workspace.yaml` (which lists only `shared`, `transport`, `dashboard`).
- `@essos/shared` is consumed via `link:../shared` so the agent's tools share the exact same SQLite repo layer as the transport and dashboard.

## Env loading

Eve loads `.env`/`.env.local` from its app root. Since the single source-of-truth `.env` lives at the repo root, `eve-concierge/.env` is a symlink to `../.env`. The transport and dashboard load the same repo-root `.env` via `@essos/shared`'s repo-root resolution.

## Build/runtime artifacts

`eve build` and `eve dev` write `.eve/` and `.output/` under `eve-concierge/`. Both are gitignored.

## Consequences

- Run the agent with `pnpm eve:dev` / `pnpm eve:build` from the repo root (these `cd` into `eve-concierge`), or `pnpm exec eve dev --no-ui --port 3000` from inside `eve-concierge/`.
- The agent name reported by Eve is `essos-eve-concierge` (from `eve-concierge/package.json`).
- Adding a `package.json` plus an `agent/` subfolder anywhere above the intended app root will again confuse app-root detection; keep the Eve project self-contained.

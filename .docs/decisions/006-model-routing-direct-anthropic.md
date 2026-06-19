# Model Routing: Direct Anthropic

## Decision

The Eve agent routes **directly to Anthropic** via the `@ai-sdk/anthropic` provider rather than through the Vercel AI Gateway. The model is configured in [eve-concierge/agent/agent.ts](../../eve-concierge/agent/agent.ts) as `anthropic(process.env.ESSOS_AGENT_MODEL ?? "claude-sonnet-4-5")`, and the provider reads the work-trial `ANTHROPIC_API_KEY` directly. The provider-managed `web_search` built-in tool is disabled.

## Why direct, not the gateway

By default Eve interprets a plain `"provider/model"` string (e.g. `anthropic/claude-sonnet-4.5`) as a **gateway** model id and routes through the Vercel AI Gateway, which requires `AI_GATEWAY_API_KEY` or a `VERCEL_OIDC_TOKEN`. The work-trial credential is a raw zero-data-retention **Anthropic** key (`sk-ant-...`), not a gateway key, so gateway routing failed with `AI Gateway received no credentials`.

Routing directly to Anthropic:

- Uses the ZDR `ANTHROPIC_API_KEY` as-is, with no gateway credential required.
- Keeps PHI/PII off a third-party gateway hop, which matters for the health-tourism context (privacy hardening is a later focus, but the model boundary is worth getting right now).

Per Eve's `agent.ts` config, passing a provider-authored `LanguageModel` (e.g. `anthropic("...")`) instead of a string is the supported way to call a provider directly. This requires installing `@ai-sdk/anthropic` (a regular project dependency).

## Model id

- Direct Anthropic ids are **hyphenated** Anthropic API ids: `claude-sonnet-4-5`.
- Gateway slugs are **dotted**: `anthropic/claude-sonnet-4.5`.

`ESSOS_AGENT_MODEL` holds the direct Anthropic id. The `@ai-sdk/anthropic` version is aligned to the `@ai-sdk/provider@4.0.0-beta` line that Eve bundles (installed as `@ai-sdk/anthropic@beta`, 4.0.0-beta.x).

## web_search built-in disabled

Eve's default harness offers a provider-managed `web_search` tool. The work-trial Anthropic org does not have web search enabled, so the model call failed with `Web search is not enabled for this organization`. It is also undesirable: the concierge must answer from its own sources of truth (itinerary, documented care instructions, Google Places via `search_local_places`), not free-search the web.

It is disabled by exporting `disableTool()` from a file named for the slug: [eve-concierge/agent/tools/web_search.ts](../../eve-concierge/agent/tools/web_search.ts).

## Known follow-up

Eve's default harness still exposes generic built-ins (`bash`, `read_file`, `write_file`, `glob`, `grep`, `web_fetch`). A patient-facing concierge has no need for filesystem/shell access; these should be disabled with the same `disableTool()` pattern before any non-demo use. Left enabled for now and tracked as a hardening item.

## Configuration

```
# .env
ANTHROPIC_API_KEY=sk-ant-...        # ZDR key, used directly
ESSOS_AGENT_MODEL=claude-sonnet-4-5 # direct Anthropic id (hyphenated)
```

## Consequences

- No gateway credential is needed to run the demo; one Anthropic key is enough.
- Switching back to the gateway (e.g. for multi-provider routing) means setting `AI_GATEWAY_API_KEY`, restoring a gateway model slug, and removing the direct-provider model instance.
- Related: see [005-eve-agent-project-structure.md](005-eve-agent-project-structure.md) for where `agent.ts` lives and how env is loaded.

import type { ConciergeIdentity } from "@essos/shared";
import { resolveConciergeBySlackUser } from "@essos/shared";
import type { App } from "@slack/bolt";
import { debug } from "./debug.js";
import { SLACK_BOT_TOKEN } from "./env.js";

type SlackClient = App["client"];

/**
 * Resolve a Slack user to a concierge identity. Looks up the user's email via
 * the Web API (needs `users:read.email`), then matches it to a synced concierge
 * in Convex, persisting the Slack id for next time. Falls back to the Slack
 * display name when there's no match so actions still attribute a human.
 */
export async function resolveIdentity(
  client: SlackClient,
  slackUserId: string
): Promise<ConciergeIdentity> {
  let email: string | null = null;
  let displayName: string | null = null;
  try {
    const info = await client.users.info({
      token: SLACK_BOT_TOKEN ?? undefined,
      user: slackUserId,
    });
    const profile = info.user?.profile;
    email = profile?.email ?? null;
    displayName = info.user?.real_name ?? profile?.display_name ?? null;
  } catch (err) {
    debug("identity", "users.info failed", String(err));
  }
  return await resolveConciergeBySlackUser({ slackUserId, email, displayName });
}

import { App, LogLevel } from "@slack/bolt";
import {
  SLACK_APP_TOKEN,
  SLACK_BOT_TOKEN,
  SLACK_ESCALATION_CHANNEL_ID,
} from "./env.js";
import { registerListeners } from "./listeners.js";
import { startOutboxLoop } from "./outboxLoop.js";

/**
 * Essos concierge Slack bridge.
 *
 * A long-running Socket Mode service (like the iMessage transport): it polls
 * Convex for escalation/progress posts and delivers them to the team's Slack
 * channel, and turns staff thread replies + buttons + slash commands + App Home
 * back into Convex writes over the service-secret machine path.
 */
async function main(): Promise<void> {
  if (!(SLACK_APP_TOKEN && SLACK_BOT_TOKEN)) {
    console.error(
      "Missing SLACK_APP_TOKEN / SLACK_BOT_TOKEN. Create a Slack app with Socket\n" +
        "Mode enabled, install it for a bot token, then set both (plus\n" +
        "SLACK_ESCALATION_CHANNEL_ID and SLACK_ENABLED=1) in .env."
    );
    process.exit(1);
  }
  if (!SLACK_ESCALATION_CHANNEL_ID) {
    console.error(
      "Missing SLACK_ESCALATION_CHANNEL_ID. Set it to the channel id where\n" +
        "escalation cards should be posted (invite the bot to that channel)."
    );
    process.exit(1);
  }

  const app = new App({
    token: SLACK_BOT_TOKEN,
    appToken: SLACK_APP_TOKEN,
    socketMode: true,
    logLevel: process.env.ESSOS_DEBUG === "1" ? LogLevel.DEBUG : LogLevel.INFO,
  });

  registerListeners(app);
  const stopOutbox = startOutboxLoop(app);

  await app.start();
  console.error(
    "Essos concierge — Slack bridge running (Socket Mode). Posting escalations to " +
      `${SLACK_ESCALATION_CHANNEL_ID}.`
  );

  const shutdown = (): void => {
    stopOutbox();
    void app.stop().finally(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

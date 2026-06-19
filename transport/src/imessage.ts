import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { CONCIERGE_HANDLES } from "./env.js";
import { eveHealthy } from "./eveClient.js";
import { normalizeHandle } from "./handles.js";
import { type TapbackName, toImessageText } from "./imessageText.js";
import { startOutboundLoop } from "./outbound.js";
import { startReminderLoop } from "./reminders.js";
import { runMessageLoop } from "./runLoop.js";

/**
 * iMessage tapbacks via the emoji `message.react(...)` accepts. Eve requests
 * one with a `[[react: ...]]` control token (see `imessageText`); iMessage maps
 * these emoji onto its native tapbacks.
 */
const TAPBACK_EMOJI: Record<TapbackName, string> = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  emphasize: "‼️",
  question: "❓",
  dislike: "👎",
};

/**
 * Live iMessage transport via Spectrum Cloud. Maps each iMessage space (group
 * or DM) to a patient conversation, ignores the agent's own messages, and
 * treats configured concierge handles as the human team.
 */
async function main(): Promise<void> {
  const projectId = process.env.SPECTRUM_PROJECT_ID;
  const projectSecret = process.env.SPECTRUM_PROJECT_SECRET;
  if (!(projectId && projectSecret)) {
    console.error(
      "Missing SPECTRUM_PROJECT_ID / SPECTRUM_PROJECT_SECRET. Create a Spectrum\n" +
        "Cloud project (app.photon.codes), then set them in .env. For local\n" +
        "iteration without credentials, use `pnpm run transport:terminal` instead."
    );
    process.exit(1);
  }

  if (!(await eveHealthy())) {
    console.error(
      "⚠  Eve dev server not reachable on EVE_BASE_URL — start it first " +
        "(cd eve-concierge && pnpm exec eve dev --no-ui --port 3000)."
    );
  }

  const app = await Spectrum({
    projectId,
    projectSecret,
    providers: [imessage.config()],
  });

  console.error(
    "Essos concierge — iMessage transport running (Spectrum Cloud)."
  );

  // Deliver concierge replies queued by the dashboard back to the patient.
  startOutboundLoop(app);

  // Proactively send source-grounded pre-op reminders ahead of each procedure.
  startReminderLoop(app);

  await runMessageLoop({
    app,
    channel: "imessage",
    spaceIdPrefix: "imessage:",
    showTyping: true,
    resolveAuthor: (_space, message, text) => {
      const authorHandle = normalizeHandle(message.sender?.id ?? null);
      return {
        authorHandle,
        isConcierge:
          authorHandle != null && CONCIERGE_HANDLES.includes(authorHandle),
        text,
      };
    },
    onResult: async (_space, message, result) => {
      if (!result.reply) {
        return;
      }
      const { text, react } = toImessageText(result.reply);
      if (react) {
        await message.react(TAPBACK_EMOJI[react]);
      }
      // A react-only turn (e.g. a light acknowledgement) sends no bubble.
      if (text) {
        await message.reply(text);
      }
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { CONCIERGE_HANDLES } from "./env.js";
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { eveHealthy } from "./eveClient.js";
import { normalizeHandle } from "./handles.js";
import { runMessageLoop } from "./runLoop.js";

/**
 * Live iMessage transport via Spectrum Cloud. Maps each iMessage space (group
 * or DM) to a patient conversation, ignores the agent's own messages, and
 * treats configured concierge handles as the human team.
 */
async function main(): Promise<void> {
  const projectId = process.env.SPECTRUM_PROJECT_ID;
  const projectSecret = process.env.SPECTRUM_PROJECT_SECRET;
  if (!projectId || !projectSecret) {
    console.error(
      "Missing SPECTRUM_PROJECT_ID / SPECTRUM_PROJECT_SECRET. Create a Spectrum\n" +
        "Cloud project (app.photon.codes), then set them in .env. For local\n" +
        "iteration without credentials, use `pnpm run transport:terminal` instead.",
    );
    process.exit(1);
  }

  if (!(await eveHealthy())) {
    console.error(
      "⚠  Eve dev server not reachable on EVE_BASE_URL — start it first " +
        "(cd eve-concierge && pnpm exec eve dev --no-ui --port 3000).",
    );
  }

  const app = await Spectrum({
    projectId,
    projectSecret,
    providers: [imessage.config()],
  });

  console.error("Essos concierge — iMessage transport running (Spectrum Cloud).");

  await runMessageLoop({
    app,
    channel: "imessage",
    spaceIdPrefix: "imessage:",
    showTyping: true,
    resolveAuthor: (_space, message, text) => {
      const authorHandle = normalizeHandle(message.sender?.id ?? null);
      return {
        authorHandle,
        isConcierge: authorHandle != null && CONCIERGE_HANDLES.includes(authorHandle),
        text,
      };
    },
    onResult: async (_space, message, result) => {
      if (result.reply) await message.reply(result.reply);
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

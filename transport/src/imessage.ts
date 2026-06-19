import { CONCIERGE_HANDLES } from "./env.js";
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { handleInbound } from "./core.js";
import { eveHealthy } from "./eveClient.js";
import { contentToText } from "./contentText.js";

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

  for await (const [space, message] of app.messages) {
    // Never react to our own outbound messages.
    if (message.direction === "outbound") continue;

    const text = contentToText(message.content);
    if (!text) continue;

    const authorHandle = message.sender?.id ?? null;
    const isConcierge =
      authorHandle != null && CONCIERGE_HANDLES.includes(authorHandle);

    await space.responding(async () => {
      const result = await handleInbound({
        spaceId: `imessage:${space.id}`,
        channel: "imessage",
        authorHandle,
        text,
        isConcierge,
      });
      if (result.reply) await message.reply(result.reply);
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

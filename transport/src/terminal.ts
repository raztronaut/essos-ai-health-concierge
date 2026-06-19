import { CONCIERGE_HANDLES, DEMO_PATIENT } from "./env.js";
import { Spectrum } from "spectrum-ts";
import { terminal } from "spectrum-ts/providers/terminal";
import { getPatientById } from "@essos/shared";
import { handleInbound } from "./core.js";
import { eveHealthy } from "./eveClient.js";
import { contentToText } from "./contentText.js";

/**
 * Local terminal transport. Type as the patient; the Essos concierge agent
 * replies in-thread. Prefix a line with `/concierge ` to simulate a human
 * concierge message (which signals takeover during an open escalation).
 */
async function main(): Promise<void> {
  const patient = getPatientById(DEMO_PATIENT);
  if (!patient) {
    console.error(
      `Demo patient "${DEMO_PATIENT}" not found. Run \`pnpm run seed\` first.`,
    );
    process.exit(1);
  }

  if (!(await eveHealthy())) {
    console.error(
      "\n⚠  Eve dev server is not reachable. In another terminal run:\n" +
        "    cd eve-concierge && pnpm exec eve dev --no-ui --port 3000\n" +
        "  (and set ANTHROPIC_API_KEY / AI_GATEWAY_API_KEY in .env)\n",
    );
  }

  console.error(
    `\nEssos concierge — terminal demo\n` +
      `Playing as: ${patient.name} (${patient.procedure} in ${patient.destination_city})\n` +
      `Type a message as the patient. Prefix with "/concierge " to act as the human team.\n`,
  );

  const app = await Spectrum({ providers: [terminal.config()] });

  for await (const [space, message] of app.messages) {
    const raw = contentToText(message.content);
    if (!raw) continue;

    let text = raw;
    let isConcierge = false;
    if (raw.startsWith("/concierge ")) {
      isConcierge = true;
      text = raw.slice("/concierge ".length).trim();
    }

    const authorHandle = isConcierge
      ? (CONCIERGE_HANDLES[0] ?? "concierge")
      : patient.handle;

    await space.responding(async () => {
      const result = await handleInbound({
        spaceId: `terminal:${space.id}`,
        channel: "terminal",
        authorHandle,
        text,
        isConcierge,
        patientId: patient.id,
      });

      if (result.reply) {
        await message.reply(result.reply);
        return;
      }
      switch (result.reason) {
        case "paused_for_review":
        case "taken_over":
          await message.reply(
            "(Eve is paused — a human concierge is handling this thread. Resolve/resume it from the dashboard.)",
          );
          break;
        case "concierge_takeover":
          await message.reply("(Concierge took over — Eve will stay quiet.)");
          break;
        case "concierge_logged":
          break;
        default:
          if (result.reason.startsWith("eve_error")) {
            await message.reply(`(Agent error: ${result.reason})`);
          }
      }
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

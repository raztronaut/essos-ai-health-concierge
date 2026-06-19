import { getPatientById } from "@essos/shared";
import { Spectrum } from "spectrum-ts";
import { terminal } from "spectrum-ts/providers/terminal";
import { CONCIERGE_HANDLES, DEMO_PATIENT } from "./env.js";
import { eveHealthy } from "./eveClient.js";
import { startPipeline } from "./pipeline.js";
import { runMessageLoop } from "./runLoop.js";

/**
 * Local terminal transport. Type as the patient; the Essos concierge agent
 * replies in-thread. Prefix a line with `/concierge ` to simulate a human
 * concierge message (which signals takeover during an open escalation).
 */
async function main(): Promise<void> {
  const patient = await getPatientById(DEMO_PATIENT);
  if (!patient) {
    console.error(
      `Demo patient "${DEMO_PATIENT}" not found. Run \`pnpm run seed\` first.`
    );
    process.exit(1);
  }

  if (!(await eveHealthy())) {
    console.error(
      "\n⚠  Eve dev server is not reachable. In another terminal run:\n" +
        "    cd eve-concierge && pnpm exec eve dev --no-ui --port 3000\n" +
        "  (and set ANTHROPIC_API_KEY in .env)\n"
    );
  }

  console.error(
    "\nEssos concierge — terminal demo\n" +
      `Playing as: ${patient.name} (${patient.procedure} in ${patient.destination_city})\n` +
      `Type a message as the patient. Prefix with "/concierge " to act as the human team.\n`
  );

  const app = await Spectrum({ providers: [terminal.config()] });

  await startPipeline();

  await runMessageLoop({
    app,
    channel: "terminal",
    spaceIdPrefix: "terminal:",
    resolveAuthor: (_space, _message, raw) => {
      const isConcierge = raw.startsWith("/concierge ");
      const text = isConcierge ? raw.slice("/concierge ".length).trim() : raw;
      if (!text) {
        return null;
      }
      return {
        authorHandle: isConcierge
          ? (CONCIERGE_HANDLES[0] ?? "concierge")
          : patient.handle,
        isConcierge,
        text,
        patientId: patient.id,
      };
    },
    // Terminal has no typing/threading; just echo each bubble back in-thread.
    buildIO: (_space, message) => ({
      send: async (bubble) => {
        await message.reply(bubble);
      },
    }),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

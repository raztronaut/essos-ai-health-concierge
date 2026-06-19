import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { sendDuePreopReminders } from "./reminders.js";

/**
 * One-shot pre-op reminder sender for demo control:
 *
 *   pnpm transport:remind                 # send to every patient with a thread
 *   pnpm transport:remind -- --patient pat_diego
 *
 * Boots Spectrum, sends due reminders once (forced so it fires regardless of how
 * far off the seeded procedure dates are), then exits. The scheduled hourly
 * sweep in the live transport uses the realistic 18h window instead. See ADR 011.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const patientFlag = args.indexOf("--patient");
  const patientId = patientFlag >= 0 ? args[patientFlag + 1] : undefined;

  const projectId = process.env.SPECTRUM_PROJECT_ID;
  const projectSecret = process.env.SPECTRUM_PROJECT_SECRET;
  if (!projectId || !projectSecret) {
    console.error(
      "Missing SPECTRUM_PROJECT_ID / SPECTRUM_PROJECT_SECRET — set them in .env first.",
    );
    process.exit(1);
  }

  const app = await Spectrum({
    projectId,
    projectSecret,
    providers: [imessage.config()],
  });

  const sent = await sendDuePreopReminders(app, { patientId, force: true });
  console.error(`Essos reminders — sent ${sent} pre-op reminder(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

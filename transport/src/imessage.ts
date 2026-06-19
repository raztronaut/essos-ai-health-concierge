import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { CONCIERGE_HANDLES, EVE_BASE_URL, GUEST_MODE } from "./env.js";
import { eveHealthy } from "./eveClient.js";
import { normalizeHandle } from "./handles.js";
import { monitorSpectrumStreamLogs, startStreamHealth } from "./health.js";
import { type TapbackName, toImessageText } from "./imessageText.js";
import { startOutboundLoop } from "./outbound.js";
import { startPipeline } from "./pipeline.js";
import { startReminderLoop } from "./reminders.js";
import { runMessageLoop } from "./runLoop.js";
import { acquireSingleInstanceLock } from "./singleInstance.js";

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
  // Spectrum Cloud allows one live consumer per project; refuse to start a
  // second local transport that would fight over the stream.
  acquireSingleInstanceLock("imessage");

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

  const app = await Spectrum({
    projectId,
    projectSecret,
    providers: [imessage.config()],
  });

  console.error(
    "Essos concierge — iMessage transport running (Spectrum Cloud)."
  );

  // Watch stream liveness: if Spectrum's connection stays down past the stale
  // window, crash so the supervisor restarts us with a fresh connection rather
  // than lingering as a silently-dead consumer. See `health.ts`.
  const healthPort = process.env.ESSOS_TRANSPORT_HEALTH_PORT
    ? Number.parseInt(process.env.ESSOS_TRANSPORT_HEALTH_PORT, 10)
    : undefined;
  const health = startStreamHealth({ healthPort });
  const restoreLogs = monitorSpectrumStreamLogs(health);

  // Eve reachability: seed from a startup probe, then re-check periodically so
  // an unreachable agent is loud (not silently failing every turn) and shown in
  // /healthz. Inbound still degrades to a holding message + escalation meanwhile.
  const probeEve = async (): Promise<void> =>
    health.setEveReachable(
      await eveHealthy(),
      `no response at ${EVE_BASE_URL}`
    );
  if (!(await eveHealthy())) {
    console.error(
      `⚠  Eve not reachable at ${EVE_BASE_URL} — start it first (pnpm eve:dev, ` +
        "which serves :3000). Inbound will degrade to a holding message + " +
        "escalation until Eve is up."
    );
    health.setEveReachable(false, `no response at ${EVE_BASE_URL}`);
  }
  const eveProbe = setInterval(() => void probeEve(), 30_000);
  eveProbe.unref?.();

  // Deliver concierge replies queued by the dashboard back to the patient.
  startOutboundLoop(app);

  // Proactively send source-grounded pre-op reminders ahead of each procedure.
  startReminderLoop(app);

  // Recover any stranded pipeline state and start the job-failure retention sweep.
  const stopPipeline = await startPipeline();

  await runMessageLoop({
    app,
    channel: "imessage",
    spaceIdPrefix: "imessage:",
    onActivity: () => health.markHealthy(),
    resolveAuthor: (_space, message, text) => {
      const authorHandle = normalizeHandle(message.sender?.id ?? null);
      const isConcierge =
        authorHandle != null && CONCIERGE_HANDLES.includes(authorHandle);
      const senderName = (message.sender as { name?: string } | null)?.name;
      return {
        authorHandle,
        isConcierge,
        text,
        // Let any unknown sender (not a known concierge) start a guest demo chat.
        allowGuest: GUEST_MODE && !isConcierge,
        guestName: senderName ?? null,
      };
    },
    // Pipeline-driven delivery: fresh paced bubbles via the space, with Eve's
    // markdown/react tokens applied per bubble and a best-effort typing cue.
    buildIO: (space, message) => ({
      send: async (bubble) => {
        const { text, react } = toImessageText(bubble);
        if (react) {
          await message.react(TAPBACK_EMOJI[react]);
        }
        if (text) {
          await space.send(text);
        }
      },
      startTyping: () => space.startTyping(),
      stopTyping: () => space.stopTyping(),
    }),
  });

  // `runMessageLoop` only returns when the message stream closes — unexpected
  // for a long-running worker. Fail loud so the supervisor restarts us.
  clearInterval(eveProbe);
  stopPipeline();
  restoreLogs();
  health.stop();
  throw new Error("iMessage message stream ended unexpectedly");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

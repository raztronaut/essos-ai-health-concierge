import type { PatientCardLink } from "@essos/shared";
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import {
  APP_STORE_ID,
  APPLE_TEAM_ID,
  CONCIERGE_HANDLES,
  EVE_BASE_URL,
  GUEST_MODE,
  IMESSAGE_EXTENSION_BUNDLE_ID,
  MINIAPP_DELIVERY,
} from "./env.js";
import { eveHealthy } from "./eveClient.js";
import { normalizeHandle } from "./handles.js";
import { monitorSpectrumStreamLogs, startStreamHealth } from "./health.js";
import { type TapbackName, toImessageText } from "./imessageText.js";
import { sendMiniAppCard } from "./miniAppCards.js";
import {
  sendRawToPatientSpace,
  startOutboundLoop,
  sendToPatientSpace,
} from "./outbound.js";
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

async function sendSpectrumMiniAppCard(
  app: Awaited<ReturnType<typeof Spectrum>>,
  spaceId: string,
  handle: string | null,
  link: PatientCardLink
): Promise<boolean> {
  const result = await sendMiniAppCard(
    link,
    {
      appStoreId: APP_STORE_ID,
      appleTeamId: APPLE_TEAM_ID,
      extensionBundleId: IMESSAGE_EXTENSION_BUNDLE_ID,
      mode: MINIAPP_DELIVERY,
    },
    (content) => sendRawToPatientSpace(app, spaceId, handle, content)
  );
  if (result.delivered) {
    console.error(
      `[transport.imessage] patient mini-app card delivered (${result.mode}, purpose=${link.purpose})`
    );
  } else if (result.reason) {
    console.error(
      `[transport.imessage] patient mini-app card fallback (${result.reason}, purpose=${link.purpose})`
    );
  }
  return result.delivered;
}

/**
 * Live iMessage transport via Spectrum Cloud. Maps each iMessage space (group
 * or DM) to a patient conversation, ignores the agent's own messages, and
 * treats configured concierge handles as the human team.
 */
async function main(): Promise<void> {
  // Spectrum Cloud allows exactly one live consumer per project. The deployed
  // Railway transport already holds it, so a local iMessage transport would
  // fight over the stream and drop/duplicate messages. The single-instance lock
  // is host-local and cannot see across hosts, so guard explicitly: run freely
  // on Railway, but refuse locally unless the operator opts in (e.g. the Railway
  // transport is intentionally stopped). Local development should use the
  // terminal transport instead.
  const onRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT ?? process.env.RAILWAY_SERVICE_ID
  );
  const allowLocalImessage = Boolean(process.env.ESSOS_ALLOW_LOCAL_IMESSAGE);
  if (!(onRailway || allowLocalImessage)) {
    console.error(
      "Refusing to start the iMessage transport locally: it would fight the\n" +
        "deployed Railway transport over the single shared Spectrum stream (one\n" +
        "live consumer per project), dropping or duplicating patient messages.\n\n" +
        "• For local development, use `pnpm run transport:terminal` (no Spectrum).\n" +
        "• To intentionally run iMessage locally (e.g. the Railway transport is\n" +
        "  stopped), set ESSOS_ALLOW_LOCAL_IMESSAGE=1."
    );
    process.exit(1);
  }

  // Host-local safety net against a second transport on this same machine.
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
    buildIO: (space, message) => {
      const spaceId = `imessage:${space.id}`;
      const authorHandle = normalizeHandle(message.sender?.id ?? null);
      return {
        send: async (bubble) => {
          const { text, react } = toImessageText(bubble);
          if (react) {
            await message.react(TAPBACK_EMOJI[react]).catch((err: unknown) => {
              console.error(
                `[transport.imessage] tapback failed for ${spaceId}: ${String(err)}`
              );
            });
          }
          if (text) {
            const delivered = await sendToPatientSpace(
              app,
              spaceId,
              authorHandle,
              text
            );
            if (!delivered) {
              throw new Error(`could not resolve iMessage space ${spaceId}`);
            }
          }
        },
        markRead: () => space.read(message),
        sendPatientCard: (link) =>
          sendSpectrumMiniAppCard(app, spaceId, authorHandle, link),
        startTyping: () => space.startTyping(),
        stopTyping: () => space.stopTyping(),
      };
    },
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

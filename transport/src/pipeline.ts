import type { PatientCardLink } from "@essos/shared";
import {
  advanceStartIndex,
  appendMessage,
  type Channel,
  cancelChain,
  carryForward,
  claimChain,
  drainBatch,
  enqueueInbound,
  getConversationById,
  getMessageBySourceEvent,
  getPatientById,
  listOrphanedChains,
  listQueuedConversations,
  markOutboundDelivered,
  type PipelineMessage,
  readCarried,
  readInflight,
  recordOutboundFailure,
  recordJobFailure,
  setChainStage,
  sweepJobFailures,
} from "@essos/shared";
import {
  generateTurn,
  handleConciergeMessage,
  handlePatientResume,
  isResumeCommand,
  resolveConversationAndPatient,
  TurnAbortedError,
} from "./core.js";
import { debug } from "./debug.js";
import {
  DEBOUNCE_MS,
  JOB_FAILURE_RETENTION_DAYS,
  MINIAPP_DELIVERY,
  SEND_PACING_MS,
} from "./env.js";
import { normalizeHandle } from "./handles.js";
import {
  createLinksForConversation,
  extractPatientCardRequests,
  formatPatientCardLink,
} from "./patientCards.js";

/**
 * The five-stage inbound pipeline (ADR 020): debounce a burst of messages into
 * one turn, mark-read/typing, generate one reply, and send it with pacing and
 * crash-safe dedup. Orchestration is in-process (timers + AbortController);
 * durability lives in Convex (`batch_queue`, `carried_messages`,
 * `inflight_chains`) so a restart can recover.
 *
 * Patient messages are logged once at enqueue (prompt persistence + Slack
 * mirror); the queue rows only drive batching, so carry-forward never
 * re-logs. Concierge messages bypass the queue and cancel any in-flight chain
 * so Eve never speaks after a human takes over.
 */

/** Provider-specific delivery for one conversation, captured from its space. */
export interface ConversationIO {
  /** Send a fresh bubble into the conversation (provider-transformed). */
  send: (text: string) => Promise<void>;
  /** Mark the inbound message/conversation as read where supported. */
  markRead?: () => Promise<void> | void;
  /** Send a native rich patient card when the provider supports it. */
  sendPatientCard?: (link: PatientCardLink) => Promise<boolean>;
  startTyping?: () => Promise<void> | void;
  stopTyping?: () => Promise<void> | void;
}

export interface EnqueueInput {
  allowGuest?: boolean;
  authorHandle: string | null;
  channel: Channel;
  guestName?: string | null;
  io: ConversationIO;
  isConcierge: boolean;
  patientId?: string;
  spaceId: string;
  sourceEventId?: string | null;
  text: string;
}

interface ChainState {
  controller: AbortController | null;
  io: ConversationIO;
  running: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

const chains = new Map<string, ChainState>();

function getState(conversationId: string, io: ConversationIO): ChainState {
  const existing = chains.get(conversationId);
  if (existing) {
    existing.io = io;
    return existing;
  }
  const created: ChainState = {
    timer: null,
    controller: null,
    io,
    running: false,
  };
  chains.set(conversationId, created);
  return created;
}

/** Cancel any in-flight chain + pending debounce for a conversation. */
async function cancel(conversationId: string): Promise<void> {
  const state = chains.get(conversationId);
  if (state?.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  state?.controller?.abort();
  await cancelChain(conversationId, Date.now()).catch(() => {});
}

/**
 * Durable enqueue for one inbound message. Resolves (or creates) the
 * conversation, handles concierge messages immediately, and otherwise logs the
 * patient message, queues it, cancels any in-flight chain, and (re)arms the
 * debounce timer.
 */
export async function enqueue(input: EnqueueInput): Promise<void> {
  const authorHandle = normalizeHandle(input.authorHandle);
  const resolved = await resolveConversationAndPatient({
    spaceId: input.spaceId,
    channel: input.channel,
    authorHandle,
    patientId: input.patientId,
    isConcierge: input.isConcierge,
    allowGuest: input.allowGuest,
    guestName: input.guestName,
  });
  if (!resolved) {
    debug("pipeline", "unknown sender, dropping:", input.spaceId);
    return;
  }
  const { conversation, patient } = resolved;

  if (input.isConcierge) {
    // A human concierge message: log + maybe take over, and stop any pending
    // Eve turn so it can't speak after the handoff.
    await cancel(conversation.id);
    await handleConciergeMessage(conversation.id, authorHandle, input.text);
    return;
  }

  if (input.sourceEventId) {
    const existing = await getMessageBySourceEvent(
      conversation.id,
      input.sourceEventId
    );
    if (existing) {
      debug(
        "pipeline",
        "duplicate inbound event, dropping",
        conversation.id,
        input.sourceEventId
      );
      return;
    }
  }

  // Log the patient message once, now (durable + prompt Slack mirror).
  const inbound = await appendMessage({
    conversationId: conversation.id,
    role: "patient",
    authorHandle: authorHandle ?? patient.handle,
    sourceEventId: input.sourceEventId ?? null,
    text: input.text,
  });

  // Patient self-serve resume: a bare "resume" command on a paused/taken-over
  // thread clears the flags and hands control back to Eve, then stops — the
  // next real message runs a normal turn. On an already-active thread it's just
  // an ordinary message and flows through to Eve below.
  if (isResumeCommand(input.text)) {
    const resumed = await handlePatientResume(conversation.id, (text) =>
      input.io.send(text)
    );
    if (resumed) {
      await cancel(conversation.id);
      return;
    }
  }

  await enqueueInbound({
    conversationId: conversation.id,
    spaceId: input.spaceId,
    clientGuid: input.sourceEventId ?? crypto.randomUUID(),
    sourceEventId: input.sourceEventId ?? null,
    authorHandle,
    sourceMessageId: inbound.id,
    text: input.text,
  });

  // A new message supersedes any in-flight turn: cancel and re-arm the window.
  const state = getState(conversation.id, input.io);
  state.controller?.abort();
  await cancelChain(conversation.id, Date.now()).catch(() => {});
  if (state.timer) {
    clearTimeout(state.timer);
  }
  state.timer = setTimeout(() => {
    state.timer = null;
    void runChain(conversation.id);
  }, DEBOUNCE_MS);
}

/** Combine a batch into one turn's text: carried context first, then new. */
export function combineText(
  carried: PipelineMessage[],
  drained: PipelineMessage[]
): string {
  return [
    ...carried.map((m) => `[Earlier message] ${m.text}`),
    ...drained.map((m) => m.text),
  ].join("\n");
}

async function runChain(conversationId: string): Promise<void> {
  const state = chains.get(conversationId);
  if (!state || state.running) {
    return;
  }
  state.running = true;
  const io = state.io;
  const chainStartedAt = Date.now();
  const chainId = `chain_${chainStartedAt}_${crypto.randomUUID().slice(0, 8)}`;
  const controller = new AbortController();
  state.controller = controller;

  let batch: PipelineMessage[] = [];
  try {
    await claimChain({ conversationId, chainId, chainStartedAt });

    // Stage 1 - flush: drain carried (already-logged context) + queued.
    await setChainStage(conversationId, "flush");
    const carried = await readCarried(conversationId);
    const drained = await drainBatch(conversationId);
    batch = [...carried, ...drained];
    if (batch.length === 0) {
      await setChainStage(conversationId, "done");
      return;
    }
    const combinedText = combineText(carried, drained);
    const sourceMessageId =
      drained.at(-1)?.source_message_id ??
      carried.at(-1)?.source_message_id ??
      "";

    const conversation = await getConversationById(conversationId);
    const patient = conversation
      ? await getPatientById(conversation.patient_id)
      : null;
    if (!(conversation && patient)) {
      await setChainStage(conversationId, "done");
      return;
    }

    // Stage 2 - mark-read + typing (typing is driven inside generateTurn).
    await setChainStage(conversationId, "read");
    if (controller.signal.aborted) {
      throw new TurnAbortedError();
    }

    // Stage 3 - generate.
    await setChainStage(conversationId, "generate");
    const result = await generateTurn({
      conversation,
      patient,
      combinedText,
      sourceMessageId,
      signal: controller.signal,
      typing: {
        start: () => io.startTyping?.(),
        stop: () => io.stopTyping?.(),
      },
    });
    if (controller.signal.aborted) {
      throw new TurnAbortedError();
    }

    // Stage 4 - send with pacing + crash-safe resume (no abort mid-send).
    await setChainStage(conversationId, "send");
    if (result.reply) {
      await sendReply(
        conversationId,
        chainId,
        result.reply,
        io,
        result.deliveryMessageIds ?? []
      );
    }
    await setChainStage(conversationId, "done");
  } catch (err) {
    if (err instanceof TurnAbortedError) {
      // A follow-up arrived; carry the whole batch forward so the next chain
      // re-processes it alongside the new message.
      await carryForward(conversationId, batch).catch(() => {});
      debug("pipeline", "turn aborted, carried forward", conversationId);
    } else {
      const error = err instanceof Error ? err.message : String(err);
      console.error(
        `[pipeline] chain failed conversation=${conversationId} chain=${chainId} error=${error}`
      );
      await recordJobFailure({
        queue: "pipeline.chain",
        jobId: chainId,
        conversationId,
        payloadJson: JSON.stringify({ count: batch.length }).slice(0, 1000),
        error,
      }).catch(() => {});
      debug("pipeline", "chain failed", conversationId, error);
    }
  } finally {
    state.controller = null;
    state.running = false;
  }
}

/** Split a reply into natural bubbles on blank lines. */
export function splitBubbles(reply: string): string[] {
  const parts = reply
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [reply];
}

type DeliveryItem =
  | { kind: "text"; text: string }
  | { kind: "patient_card"; link: PatientCardLink };

async function buildDeliveryItems(
  conversationId: string,
  reply: string
): Promise<DeliveryItem[]> {
  const extracted = extractPatientCardRequests(reply);
  const items = extracted.text
    ? splitBubbles(extracted.text).map<DeliveryItem>((text) => ({
        kind: "text",
        text,
      }))
    : [];
  const links = await createLinksForConversation(
    conversationId,
    extracted.purposes
  );
  for (const link of links) {
    items.push({ kind: "patient_card", link });
  }
  return items.length > 0 ? items : [{ kind: "text", text: reply }];
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send the reply as paced bubbles, persisting the resume cursor after each so a
 * crash resumes from `start_index` without re-sending (the `sent_guids` set is
 * the second line of defense). Not aborted mid-send: sends are fast and a
 * partial re-send would duplicate.
 */
async function sendReply(
  conversationId: string,
  chainId: string,
  reply: string,
  io: ConversationIO,
  deliveryMessageIds: string[] = []
): Promise<void> {
  const items = await buildDeliveryItems(conversationId, reply);
  const chain = await readInflight(conversationId);
  const startIndex = chain?.chain_id === chainId ? chain.start_index : 0;
  const sent = new Set(chain?.chain_id === chainId ? chain.sent_guids : []);

  try {
    for (let i = startIndex; i < items.length; i++) {
      const guid = `${chainId}-${i}`;
      if (sent.has(guid)) {
        continue;
      }
      const item = items[i];
      if (item?.kind === "patient_card") {
        const sentNative =
          MINIAPP_DELIVERY !== "link" && io.sendPatientCard
            ? await io.sendPatientCard(item.link)
            : false;
        if (!sentNative) {
          await io.send(formatPatientCardLink(item.link));
        }
      } else {
        await io.send(item?.text ?? "");
      }
      await advanceStartIndex({
        conversationId,
        startIndex: i + 1,
        sentGuid: guid,
      });
      if (i < items.length - 1 && SEND_PACING_MS > 0) {
        await sleep(SEND_PACING_MS);
      }
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await Promise.all(
      deliveryMessageIds.map((messageId) =>
        recordOutboundFailure({ messageId, error, permanent: true }).catch(
          () => undefined
        )
      )
    );
    throw err;
  }

  await Promise.all(
    deliveryMessageIds.map((messageId) =>
      markOutboundDelivered(messageId).catch(() => undefined)
    )
  );
}

/**
 * Startup recovery + retention. Leftover queued messages are drained when the
 * next message for that conversation arrives (we have no live space until
 * then), so here we only clear stale in-flight markers and schedule the
 * `job_failures` retention sweep. Returns a stop function for the sweep timer.
 */
export async function startPipeline(): Promise<() => void> {
  const queued = await listQueuedConversations().catch(() => [] as string[]);
  const orphaned = await listOrphanedChains().catch(() => [] as string[]);
  if (queued.length > 0 || orphaned.length > 0) {
    debug(
      "pipeline",
      `recovery: ${queued.length} conversations with stranded messages, ` +
        `${orphaned.length} orphaned chains (cleared)`
    );
  }
  for (const conversationId of orphaned) {
    await setChainStage(conversationId, "done").catch(() => {});
  }

  const sweep = (): void => {
    void sweepJobFailures(JOB_FAILURE_RETENTION_DAYS).catch((err) =>
      debug("pipeline", "retention sweep failed", String(err))
    );
  };
  sweep();
  const timer = setInterval(sweep, 24 * 60 * 60 * 1000);
  timer.unref?.();
  return () => clearInterval(timer);
}

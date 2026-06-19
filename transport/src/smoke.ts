import {
  deleteConversationBySpace,
  type EscalationCategory,
  escalateToHuman,
  getConversationBySpace,
  listOpenEscalationsForConversation,
  resolveEscalationFromSlack,
  resumeAutomation,
} from "@essos/shared";
import { type EveResponder, handleInbound } from "./core.js";
import { DEMO_PATIENT } from "./env.js";

/**
 * Verifies the transport core + Convex + handoff rules without a live model.
 * The stub responder mimics what the real `escalate_to_human` tool does (create
 * a flag + pause automation) when the message looks unsafe.
 */
const stub: EveResponder = async (message, prior) => {
  const session = prior ?? {
    sessionId: "stub_ses",
    continuationToken: "stub",
    turns: 1,
  };
  const lower = message.toLowerCase();

  // Pull ids out of the context block the transport prepended.
  const conversationId = /conversation_id:\s*(\S+)/.exec(message)?.[1] ?? "";
  const patientId = /patient_id:\s*(\S+)/.exec(message)?.[1] ?? "";
  const sourceMessageId = /source_message_id:\s*(\S+)/.exec(message)?.[1] ?? "";

  const escalate = (reason: EscalationCategory, level: "High" | "Med") =>
    escalateToHuman({
      conversationId,
      patientId,
      level,
      reason,
      summary: `stub escalation (${reason})`,
      sourceMessageId,
    });

  if (lower.includes("swelling") || lower.includes("fever")) {
    await escalate("postop_symptom_or_recovery", "High");
    return {
      text: "I want to make sure you get the right answer, so I'm flagging this for the Essos team now.",
      session,
    };
  }
  if (lower.includes("ibuprofen") || lower.includes("medication")) {
    await escalate("medication_decision", "High");
    return {
      text: "I'm flagging this medication question for the concierge team to confirm.",
      session,
    };
  }
  return { text: "Here is the info you asked for (stub answer).", session };
};

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

/** Remove every conversation (cascades to messages/escalations/activity) this run created. */
async function teardown(spaceIds: string[]): Promise<void> {
  for (const spaceId of spaceIds) {
    await deleteConversationBySpace(spaceId);
  }
}

async function run(): Promise<string[]> {
  const spaceId = `terminal:smoke-${Date.now()}`;
  const orphanSpaceId = `terminal:smoke-orphan-${Date.now()}`;
  console.log(`\nSmoke test on space ${spaceId} (patient ${DEMO_PATIENT})\n`);

  // 0) A brand-new space with no resolvable patient -> unknown_patient.
  const r0 = await handleInbound({
    spaceId: orphanSpaceId,
    channel: "terminal",
    authorHandle: "+10000000000",
    text: "hello?",
    eveRespond: stub,
  });
  check(
    "unknown sender yields unknown_patient",
    r0.reason === "unknown_patient"
  );

  // 1) Routine question -> answered, automation stays active.
  const r1 = await handleInbound({
    spaceId,
    channel: "terminal",
    authorHandle: null,
    text: "Hi, what's my hotel reservation number?",
    patientId: DEMO_PATIENT,
    eveRespond: stub,
  });
  check("routine question is answered", r1.reason === "answered" && !!r1.reply);
  const conv = (await getConversationBySpace(spaceId))!;
  check("conversation created", !!conv);
  check(
    "automation active after routine answer",
    conv.automation_state === "active"
  );

  // 2) Post-op symptom -> answered with ack, escalation created, paused.
  const r2 = await handleInbound({
    spaceId,
    channel: "terminal",
    authorHandle: null,
    text: "Is this swelling on my nose normal?",
    patientId: DEMO_PATIENT,
    eveRespond: stub,
  });
  check("escalation question gets an acknowledgement", !!r2.reply);
  const openAfter = await listOpenEscalationsForConversation(conv.id);
  check("an escalation was created", openAfter.length >= 1);
  check(
    "escalation reason is post-op symptom",
    openAfter.some((e) => e.reason === "postop_symptom_or_recovery")
  );
  const convPaused = (await getConversationBySpace(spaceId))!;
  check(
    "automation paused after escalation",
    convPaused.automation_state === "paused_for_review"
  );

  // 3) Patient sends a message while paused -> Eve doesn't autonomously answer;
  //    a one-time holding notice is sent (ADR 010/011), then it goes silent.
  const r3 = await handleInbound({
    spaceId,
    channel: "terminal",
    authorHandle: null,
    text: "ok should I be worried?",
    patientId: DEMO_PATIENT,
    eveRespond: stub,
  });
  check(
    "paused: one-time holding notice, no autonomous answer",
    r3.reason === "paused_for_review"
  );
  const r3b = await handleInbound({
    spaceId,
    channel: "terminal",
    authorHandle: null,
    text: "still waiting…",
    patientId: DEMO_PATIENT,
    eveRespond: stub,
  });
  check(
    "paused: silent on follow-ups after the holding notice",
    r3b.reply === null && r3b.reason === "paused_for_review"
  );

  // 4) Concierge replies during open escalation -> takeover.
  const r4 = await handleInbound({
    spaceId,
    channel: "terminal",
    authorHandle: "concierge",
    text: "Hi Amira, this is Ryan from Essos — I've got this.",
    isConcierge: true,
    eveRespond: stub,
  });
  check(
    "concierge reply triggers takeover",
    r4.reason === "concierge_takeover"
  );
  check(
    "automation is taken_over",
    (await getConversationBySpace(spaceId))!.automation_state === "taken_over"
  );

  // 5) Resume automation -> patient messages answered again.
  await resumeAutomation(conv.id, "Ryan");
  const r5 = await handleInbound({
    spaceId,
    channel: "terminal",
    authorHandle: null,
    text: "Great, thanks! Where can I get a coffee nearby?",
    patientId: DEMO_PATIENT,
    eveRespond: stub,
  });
  check("answers again after resume", r5.reason === "answered" && !!r5.reply);

  // 6) Concierge message with no open escalation -> logged, no takeover.
  const r6 = await handleInbound({
    spaceId,
    channel: "terminal",
    authorHandle: "concierge",
    text: "Following up — all set on our end.",
    isConcierge: true,
    eveRespond: stub,
  });
  check(
    "concierge message with no open escalation is logged",
    r6.reason === "concierge_logged"
  );

  // 7) Resolving an Eve-paused thread (no human takeover) auto-resumes Eve, so
  //    the patient is never stranded silent after a flag is closed.
  const resolveSpaceId = `terminal:smoke-resolve-${Date.now()}`;
  await handleInbound({
    spaceId: resolveSpaceId,
    channel: "terminal",
    authorHandle: null,
    text: "Is this swelling on my nose normal?",
    patientId: DEMO_PATIENT,
    eveRespond: stub,
  });
  const pausedConv = (await getConversationBySpace(resolveSpaceId))!;
  check(
    "resolve-flow: paused after escalation",
    pausedConv.automation_state === "paused_for_review"
  );
  const [openFlag] = await listOpenEscalationsForConversation(pausedConv.id);
  await resolveEscalationFromSlack({
    escalationId: openFlag?.id ?? "",
    label: "Ryan",
  });
  const resolvedConv = (await getConversationBySpace(resolveSpaceId))!;
  check(
    "resolve-flow: Eve auto-resumes when the last flag is resolved",
    resolvedConv.automation_state === "active"
  );

  return [spaceId, orphanSpaceId, resolveSpaceId];
}

async function main(): Promise<void> {
  let created: string[] = [];
  try {
    created = await run();
  } finally {
    // Best-effort cleanup so repeated runs don't accumulate rows.
    await teardown(created);
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

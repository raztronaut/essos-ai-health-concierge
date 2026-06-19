/**
 * Production -> eval flywheel (ADR 022).
 *
 * Turn a real escalation into a regression eval case. Given an escalation id,
 * this reads the patient and the message that triggered it, infers the expected
 * behavior, and writes `eve-concierge/evals/regressions/<slug>.eval.ts`. A human
 * reviews and commits it, so each mishandled flag (an over-escalation a
 * concierge marked unnecessary, or a draft they heavily rewrote) becomes a
 * permanent regression test.
 *
 * Usage:
 *   pnpm eval:from-escalation <escalationId> [--expect autonomous|escalate]
 *
 * Expected behavior is inferred when not passed:
 *   - feedback_valid === false (over-escalation) -> expect "autonomous"
 *   - otherwise                                   -> expect "escalate"
 *
 * Needs CONVEX_URL / CONVEX_SITE_URL in the environment (same as the seeders).
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getEscalationCard, listMessages, type Patient } from "@essos/shared";

type Expectation = "autonomous" | "escalate";

const PATIENT_CONST: Record<string, string> = {
  pat_maya: "PATIENT_RHINO",
  pat_diego: "PATIENT_HAIR",
};

function parseArgs(argv: string[]): {
  escalationId: string;
  expect?: Expectation;
} {
  const args = argv.slice(2);
  const escalationId = args.find((a) => !a.startsWith("--"));
  if (!escalationId) {
    throw new Error(
      "Usage: pnpm eval:from-escalation <escalationId> [--expect autonomous|escalate]"
    );
  }
  const expectIdx = args.indexOf("--expect");
  const expect =
    expectIdx >= 0 ? (args[expectIdx + 1] as Expectation) : undefined;
  if (expect && expect !== "autonomous" && expect !== "escalate") {
    throw new Error('--expect must be "autonomous" or "escalate"');
  }
  return { escalationId, expect };
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "case"
  );
}

/** Reference a seeded patient by its eval constant, or inline the id. */
function patientRef(patient: Patient): {
  importName: string | null;
  expr: string;
} {
  const constName = PATIENT_CONST[patient.id];
  if (constName) {
    return { importName: constName, expr: constName };
  }
  return { importName: null, expr: JSON.stringify(patient.id) };
}

function renderEval(args: {
  description: string;
  patient: Patient;
  text: string;
  spaceId: string;
  expect: Expectation;
}): string {
  const { importName, expr } = patientRef(args.patient);
  const imports = ["essosTurn", ...(importName ? [importName] : [])]
    .sort()
    .join(", ");
  const assertions =
    args.expect === "escalate"
      ? '    t.calledTool("escalate_to_human");'
      : '    t.notCalledTool("escalate_to_human");';
  return `import { defineEval } from "eve/evals";
import { ${imports} } from "#evals/context.js";

// Generated from a production escalation by scripts/eval-from-escalation.ts.
// Review before committing: confirm the expected behavior is what Eve SHOULD do.
export default defineEval({
  description:
    ${JSON.stringify(args.description)},
  async test(t) {
    const turn = await essosTurn({
      patientId: ${expr},
      spaceId: ${JSON.stringify(args.spaceId)},
      text: ${JSON.stringify(args.text)},
    });
    await t.send(turn.message);
    t.completed();
${assertions}
  },
});
`;
}

async function main(): Promise<void> {
  const { escalationId, expect } = parseArgs(process.argv);
  const card = await getEscalationCard(escalationId);
  if (!card) {
    throw new Error(`No escalation "${escalationId}" found.`);
  }
  const { escalation, patient } = card;
  if (!patient) {
    throw new Error(`Escalation "${escalationId}" has no patient.`);
  }

  // Recover the patient message that triggered the escalation.
  const messages = await listMessages(escalation.conversation_id);
  const trigger =
    messages.find((m) => m.id === escalation.source_message_id) ??
    [...messages].reverse().find((m) => m.role === "patient");
  const text = trigger?.text?.trim();
  if (!text) {
    throw new Error(
      `Could not recover the triggering message for "${escalationId}".`
    );
  }

  const expectation: Expectation =
    expect ?? (escalation.feedback_valid === false ? "autonomous" : "escalate");
  const slug = slugify(`${escalation.reason}-${text}`);
  const description =
    expectation === "escalate"
      ? `Regression (${escalation.reason}): "${text}" must escalate.`
      : `Regression (${escalation.reason}): "${text}" should be handled autonomously (was an unnecessary escalation).`;

  const dir = path.join(process.cwd(), "eve-concierge", "evals", "regressions");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${slug}.eval.ts`);
  await writeFile(
    file,
    renderEval({
      description,
      patient,
      text,
      spaceId: `eval:regression:${slug}`,
      expect: expectation,
    }),
    "utf8"
  );

  process.stdout.write(
    `Wrote ${path.relative(process.cwd(), file)} (expect: ${expectation}).\n` +
      "Review it, run `pnpm exec eve eval`, then commit.\n"
  );
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

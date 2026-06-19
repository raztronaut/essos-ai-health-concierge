/**
 * Seed the local SQLite store from the mock asset fixture pack.
 *
 * The canonical demo data lives in `mock-assets/`: JSON records for patients
 * and Markdown source docs that also generate the polished PDFs. This keeps the
 * agent/dashboard seed data aligned with the demo artifacts.
 *
 * Run with `pnpm seed` (append-ish) or `pnpm seed:reset` (drop + recreate).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { getDb, resetDb, REPO_ROOT } from "./index.js";
import {
  addMessage,
  createEscalation,
  getOrCreateConversation,
  insertCareInstruction,
  insertItineraryEvent,
  insertSourceDocument,
  logActivity,
  setAutomationState,
  upsertPatient,
} from "./repo.js";
import { nowIso } from "./ids.js";
import type {
  ActivityEvent,
  CareAnswerPolicy,
  CarePhase,
  CareSourceStatus,
  CareSourceType,
  Channel,
  ItineraryKind,
  MessageRole,
  Patient,
  Procedure,
  SourceDocument,
  SourceDocumentKind,
} from "./types.js";
import type { EscalationCategory, EscalationLevel } from "./taxonomy.js";

const shouldReset = process.argv.includes("--reset");
const mockAssetsRoot = resolve(REPO_ROOT, "mock-assets");
const patientFixturesDir = resolve(mockAssetsRoot, "patients");
const sourceDocsDir = resolve(mockAssetsRoot, "source-docs");
const manifestPath = resolve(mockAssetsRoot, "manifest.json");

interface FixturePatient {
  id: string;
  name: string;
  handle: string;
  procedure: Procedure;
  destination_city: string;
  destination_country: string;
  clinic_name: string;
  hotel_name: string;
  companion_name: string | null;
  dietary_notes: string | null;
}

interface FixtureItineraryEvent {
  kind: ItineraryKind;
  title: string;
  detail?: string | null;
  location?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  confirmation_number?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
}

interface FixtureCareInstruction {
  source_document?: string;
  phase: CarePhase;
  procedure: Procedure;
  title: string;
  body: string;
  source_type: CareSourceType;
  source_status: CareSourceStatus;
  answer_policy: CareAnswerPolicy;
  effective_from?: string | null;
  effective_until?: string | null;
}

interface FixtureMessage {
  role: MessageRole;
  author_handle?: string | null;
  text: string;
  category?: EscalationCategory | null;
  capture_as?: string;
}

interface FixtureConversation {
  space_id: string;
  channel: Channel;
  automation_state: "active" | "paused_for_review" | "taken_over" | "resolved";
  messages: FixtureMessage[];
  escalation?: {
    source_message_capture?: string;
    level: EscalationLevel;
    reason: EscalationCategory;
    summary: string;
  };
  activity?: Array<{
    event: ActivityEvent;
    actor: string;
    detail?: string | null;
  }>;
}

interface PatientFixture {
  patient: FixturePatient;
  source_documents?: string[];
  itinerary_source_document?: string;
  itinerary: FixtureItineraryEvent[];
  care_instructions: FixtureCareInstruction[];
  seeded_conversation?: FixtureConversation;
}

interface SourceDocMeta {
  id: string;
  slug: string;
  title: string;
  patient_id?: string | null;
  kind: SourceDocumentKind;
  source_type: CareSourceType;
  source_status: CareSourceStatus;
  answer_policy: CareAnswerPolicy;
  pdf: string;
}

interface Manifest {
  documents?: Array<{
    slug: string;
    markdown_path: string;
    pdf_path: string;
    sha256: string;
  }>;
}

type ManifestDocument = NonNullable<Manifest["documents"]>[number];

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function parseSourceDoc(path: string): SourceDocMeta {
  const text = readFileSync(path, "utf8");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) {
    throw new Error(`Source doc is missing front matter: ${path}`);
  }
  const raw: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    if (!line.trim()) continue;
    const [key, ...rest] = line.split(":");
    raw[key!.trim()] = rest.join(":").trim();
  }
  return {
    id: raw.id!,
    slug: raw.slug!,
    title: raw.title!,
    patient_id: raw.patient_id?.trim() ? raw.patient_id.trim() : null,
    kind: raw.kind! as SourceDocumentKind,
    source_type: raw.source_type! as CareSourceType,
    source_status: raw.source_status! as CareSourceStatus,
    answer_policy: raw.answer_policy! as CareAnswerPolicy,
    pdf: raw.pdf!,
  };
}

function loadPatientFixtures(): PatientFixture[] {
  return readdirSync(patientFixturesDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => readJson<PatientFixture>(resolve(patientFixturesDir, file)));
}

function loadManifest(): Map<string, ManifestDocument> {
  if (!existsSync(manifestPath)) return new Map();
  const manifest = readJson<Manifest>(manifestPath);
  return new Map((manifest.documents ?? []).map((doc) => [doc.slug, doc]));
}

function loadSourceDocuments(): Map<string, SourceDocument> {
  const manifestBySlug = loadManifest();
  const docs = new Map<string, SourceDocument>();
  const files = readdirSync(sourceDocsDir)
    .filter((file) => file.endsWith(".md"))
    .sort();

  for (const file of files) {
    const absoluteMarkdownPath = resolve(sourceDocsDir, file);
    const meta = parseSourceDoc(absoluteMarkdownPath);
    const manifestEntry = manifestBySlug.get(meta.slug);
    const markdownPath =
      manifestEntry?.markdown_path ?? `mock-assets/source-docs/${file}`;
    const pdfPath = manifestEntry?.pdf_path ?? `output/pdf/essos/${meta.pdf}`;
    const fallbackHash = existsSync(resolve(REPO_ROOT, pdfPath))
      ? sha256File(resolve(REPO_ROOT, pdfPath))
      : sha256File(absoluteMarkdownPath);

    docs.set(meta.slug, {
      id: meta.id,
      patient_id: meta.patient_id ?? null,
      kind: meta.kind,
      title: meta.title,
      source_type: meta.source_type,
      source_status: meta.source_status,
      answer_policy: meta.answer_policy,
      markdown_path: markdownPath,
      pdf_path: pdfPath,
      sha256: manifestEntry?.sha256 ?? fallbackHash,
      created_at: nowIso(),
    });
  }

  return docs;
}

function sourceId(
  docsBySlug: Map<string, SourceDocument>,
  slug: string | undefined,
): string | null {
  if (!slug) return null;
  const doc = docsBySlug.get(slug);
  if (!doc) {
    throw new Error(`Fixture references unknown source document: ${slug}`);
  }
  return doc.id;
}

function seedPatientRecord(fixture: PatientFixture): void {
  const patient: Patient = {
    ...fixture.patient,
    created_at: nowIso(),
  };
  upsertPatient(patient);
}

function seedSourceDocuments(docsBySlug: Map<string, SourceDocument>): void {
  for (const doc of docsBySlug.values()) {
    insertSourceDocument(doc);
  }
}

function seedItinerary(
  fixture: PatientFixture,
  docsBySlug: Map<string, SourceDocument>,
): void {
  const itinerarySourceId = sourceId(
    docsBySlug,
    fixture.itinerary_source_document,
  );
  fixture.itinerary.forEach((event, index) => {
    insertItineraryEvent({
      patient_id: fixture.patient.id,
      source_document_id: itinerarySourceId,
      sort_order: index,
      ...event,
    });
  });
}

function seedCareInstructions(
  fixture: PatientFixture,
  docsBySlug: Map<string, SourceDocument>,
): void {
  for (const doc of fixture.care_instructions) {
    insertCareInstruction({
      patient_id: fixture.patient.id,
      source_document_id: sourceId(docsBySlug, doc.source_document),
      phase: doc.phase,
      procedure: doc.procedure,
      title: doc.title,
      body: doc.body,
      source_type: doc.source_type,
      source_status: doc.source_status,
      answer_policy: doc.answer_policy,
      effective_from: doc.effective_from ?? null,
      effective_until: doc.effective_until ?? null,
    });
  }
}

function seedConversation(fixture: PatientFixture): void {
  const seeded = fixture.seeded_conversation;
  if (!seeded) return;

  const conversation = getOrCreateConversation({
    spaceId: seeded.space_id,
    patientId: fixture.patient.id,
    channel: seeded.channel,
  });
  const capturedMessages = new Map<string, string>();

  for (const message of seeded.messages) {
    const inserted = addMessage({
      conversationId: conversation.id,
      role: message.role,
      authorHandle: message.author_handle ?? null,
      text: message.text,
      category: message.category ?? null,
    });
    if (message.capture_as) {
      capturedMessages.set(message.capture_as, inserted.id);
    }
  }

  let escalationId: string | null = null;
  if (seeded.escalation) {
    const escalation = createEscalation({
      conversationId: conversation.id,
      patientId: fixture.patient.id,
      level: seeded.escalation.level,
      reason: seeded.escalation.reason,
      summary: seeded.escalation.summary,
      sourceMessageId: seeded.escalation.source_message_capture
        ? capturedMessages.get(seeded.escalation.source_message_capture) ?? null
        : null,
    });
    escalationId = escalation.id;
  }

  setAutomationState(conversation.id, seeded.automation_state);

  for (const activity of seeded.activity ?? []) {
    const detail =
      activity.event === "escalated" && escalationId
        ? `${activity.detail ?? "escalated"} - ${escalationId}`
        : activity.detail ?? null;
    logActivity({
      conversationId: conversation.id,
      event: activity.event,
      actor: activity.actor,
      detail,
    });
  }
}

function main(): void {
  if (shouldReset) {
    resetDb();
    console.log("- Reset database (dropped + recreated tables).");
  } else {
    getDb();
  }

  const fixtures = loadPatientFixtures();
  const docsBySlug = loadSourceDocuments();

  fixtures.forEach(seedPatientRecord);
  seedSourceDocuments(docsBySlug);

  for (const fixture of fixtures) {
    seedItinerary(fixture, docsBySlug);
    seedCareInstructions(fixture, docsBySlug);
    seedConversation(fixture);
  }

  const counts = getDb()
    .prepare(
      `select
        (select count(*) from patients) as patients,
        (select count(*) from source_documents) as source_documents,
        (select count(*) from itinerary_events) as itinerary_events,
        (select count(*) from care_instructions) as care_instructions,
        (select count(*) from conversations) as conversations,
        (select count(*) from messages) as messages,
        (select count(*) from escalations) as escalations`,
    )
    .get() as Record<string, number>;

  console.log("- Seeded fixture data:");
  for (const [table, count] of Object.entries(counts)) {
    console.log(`    ${table}: ${count}`);
  }
  console.log("Done.");
}

main();

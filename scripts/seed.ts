/**
 * Seed the Convex backend from the mock-asset fixture pack.
 *
 * Convex functions can't read the filesystem, so this Node runner parses the
 * fixtures + source-doc front matter + manifest (ported from the old
 * shared/src/seed.ts) and pushes a single payload to the `seed.importAll`
 * mutation. Run with `pnpm seed` or `pnpm seed:reset`.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..");
const shouldReset = process.argv.includes("--reset");

const mockAssetsRoot = resolve(REPO_ROOT, "mock-assets");
const patientFixturesDir = resolve(mockAssetsRoot, "patients");
const sourceDocsDir = resolve(mockAssetsRoot, "source-docs");
const manifestPath = resolve(mockAssetsRoot, "manifest.json");

function nowIso(): string {
  return new Date().toISOString();
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

interface SourceDocMeta {
  id: string;
  slug: string;
  title: string;
  patient_id: string | null;
  kind: string;
  source_type: string;
  source_status: string;
  answer_policy: string;
  pdf: string;
}

function parseSourceDoc(path: string): SourceDocMeta {
  const text = readFileSync(path, "utf8");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) throw new Error(`Source doc missing front matter: ${path}`);
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
    kind: raw.kind!,
    source_type: raw.source_type!,
    source_status: raw.source_status!,
    answer_policy: raw.answer_policy!,
    pdf: raw.pdf!,
  };
}

interface ManifestDoc {
  slug: string;
  markdown_path: string;
  pdf_path: string;
  sha256: string;
}

function loadManifest(): Map<string, ManifestDoc> {
  if (!existsSync(manifestPath)) return new Map();
  const manifest = readJson<{ documents?: ManifestDoc[] }>(manifestPath);
  return new Map((manifest.documents ?? []).map((d) => [d.slug, d]));
}

interface SourceDocument {
  id: string;
  patient_id: string | null;
  kind: string;
  title: string;
  source_type: string;
  source_status: string;
  answer_policy: string;
  markdown_path: string;
  pdf_path: string;
  sha256: string;
  created_at: string;
}

function loadSourceDocuments(): Map<string, SourceDocument> {
  const manifestBySlug = loadManifest();
  const docs = new Map<string, SourceDocument>();
  const files = readdirSync(sourceDocsDir).filter((f) => f.endsWith(".md")).sort();
  for (const file of files) {
    const absMd = resolve(sourceDocsDir, file);
    const meta = parseSourceDoc(absMd);
    const entry = manifestBySlug.get(meta.slug);
    const markdownPath = entry?.markdown_path ?? `mock-assets/source-docs/${file}`;
    const pdfPath = entry?.pdf_path ?? `mock-assets/pdf/essos/${meta.pdf}`;
    const fallbackHash = existsSync(resolve(REPO_ROOT, pdfPath))
      ? sha256File(resolve(REPO_ROOT, pdfPath))
      : sha256File(absMd);
    docs.set(meta.slug, {
      id: meta.id,
      patient_id: meta.patient_id,
      kind: meta.kind,
      title: meta.title,
      source_type: meta.source_type,
      source_status: meta.source_status,
      answer_policy: meta.answer_policy,
      markdown_path: markdownPath,
      pdf_path: pdfPath,
      sha256: entry?.sha256 ?? fallbackHash,
      created_at: nowIso(),
    });
  }
  return docs;
}

function sourceId(docs: Map<string, SourceDocument>, slug: string | undefined): string | null {
  if (!slug) return null;
  const doc = docs.get(slug);
  if (!doc) throw new Error(`Fixture references unknown source document: ${slug}`);
  return doc.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function loadPatientFixtures(): Json[] {
  return readdirSync(patientFixturesDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson<Json>(resolve(patientFixturesDir, f)));
}

function readConvexUrl(): string {
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  const envLocal = resolve(REPO_ROOT, ".env.local");
  if (existsSync(envLocal)) {
    for (const line of readFileSync(envLocal, "utf8").split("\n")) {
      const m = /^CONVEX_URL=(.*)$/.exec(line.trim());
      if (m) return m[1]!.trim();
    }
  }
  throw new Error("CONVEX_URL not set (run `npx convex dev` first)");
}

async function main(): Promise<void> {
  const fixtures = loadPatientFixtures();
  const docsBySlug = loadSourceDocuments();

  const patients: Json[] = [];
  const itinerary: Json[] = [];
  const careInstructions: Json[] = [];
  const conversations: Json[] = [];

  for (const fixture of fixtures) {
    patients.push({ ...fixture.patient, created_at: nowIso() });

    const itinSourceId = sourceId(docsBySlug, fixture.itinerary_source_document);
    fixture.itinerary.forEach((event: Json, index: number) => {
      itinerary.push({
        patient_id: fixture.patient.id,
        source_document_id: itinSourceId,
        sort_order: index,
        ...event,
      });
    });

    for (const care of fixture.care_instructions) {
      careInstructions.push({
        patient_id: fixture.patient.id,
        source_document_id: sourceId(docsBySlug, care.source_document),
        phase: care.phase,
        procedure: care.procedure,
        title: care.title,
        body: care.body,
        source_type: care.source_type,
        source_status: care.source_status,
        answer_policy: care.answer_policy,
        effective_from: care.effective_from ?? null,
        effective_until: care.effective_until ?? null,
      });
    }

    if (fixture.seeded_conversation) {
      conversations.push({
        ...fixture.seeded_conversation,
        patient_id: fixture.patient.id,
      });
    }
  }

  const payload = {
    patients,
    sourceDocuments: [...docsBySlug.values()],
    itinerary,
    careInstructions,
    conversations,
  };

  const client = new ConvexHttpClient(readConvexUrl());
  if (shouldReset) {
    await client.mutation(api.seed.clearAll, {});
    console.log("- Cleared all tables.");
  }
  await client.mutation(api.seed.importAll, { data: payload });
  console.log("- Seeded fixture data:");
  console.log(`    patients: ${payload.patients.length}`);
  console.log(`    source_documents: ${payload.sourceDocuments.length}`);
  console.log(`    itinerary_events: ${payload.itinerary.length}`);
  console.log(`    care_instructions: ${payload.careInstructions.length}`);
  console.log(`    conversations: ${payload.conversations.length}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

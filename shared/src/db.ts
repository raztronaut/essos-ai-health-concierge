import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { resolveDbPath } from "./config.js";

const SCHEMA = `
create table if not exists patients (
  id text primary key,
  name text not null,
  handle text not null unique,
  procedure text not null,
  destination_city text not null,
  destination_country text not null,
  clinic_name text not null,
  hotel_name text not null,
  companion_name text,
  dietary_notes text,
  created_at text not null
);

create table if not exists source_documents (
  id text primary key,
  patient_id text references patients(id) on delete cascade,
  kind text not null,
  title text not null,
  source_type text not null,
  source_status text not null,
  answer_policy text not null,
  markdown_path text not null,
  pdf_path text not null,
  sha256 text not null,
  created_at text not null
);

create table if not exists itinerary_events (
  id text primary key,
  patient_id text not null references patients(id) on delete cascade,
  source_document_id text references source_documents(id) on delete set null,
  kind text not null,
  title text not null,
  detail text,
  location text,
  starts_at text,
  ends_at text,
  confirmation_number text,
  driver_name text,
  driver_phone text,
  sort_order integer not null default 0
);

create table if not exists care_instructions (
  id text primary key,
  patient_id text not null references patients(id) on delete cascade,
  source_document_id text references source_documents(id) on delete set null,
  phase text not null,
  procedure text not null,
  title text not null,
  body text not null,
  source_type text not null,
  source_status text not null,
  answer_policy text not null,
  effective_from text,
  effective_until text,
  created_at text not null,
  updated_at text not null
);

create table if not exists conversations (
  id text primary key,
  patient_id text not null references patients(id) on delete cascade,
  space_id text not null unique,
  channel text not null,
  automation_state text not null default 'active',
  created_at text not null,
  updated_at text not null,
  eve_session text
);

create table if not exists messages (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  role text not null,
  author_handle text,
  text text not null,
  category text,
  created_at text not null,
  meta_json text
);

create table if not exists escalations (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  patient_id text not null references patients(id) on delete cascade,
  level text not null,
  reason text not null,
  summary text not null,
  source_message_id text,
  status text not null default 'open',
  assignee text,
  created_at text not null,
  resolved_at text,
  suggested_reply text,
  suggested_reply_sources text
);

create table if not exists activity_log (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  event text not null,
  actor text not null,
  detail text,
  created_at text not null
);

create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_escalations_status on escalations(status, created_at);
create index if not exists idx_source_documents_patient on source_documents(patient_id, kind);
create index if not exists idx_itinerary_patient on itinerary_events(patient_id, sort_order);
create index if not exists idx_care_patient on care_instructions(patient_id, phase);
create index if not exists idx_activity_conversation on activity_log(conversation_id, created_at);
`;

let singleton: DatabaseSync | null = null;

/** Open (or reuse) the local SQLite database and ensure the schema exists. */
export function getDb(): DatabaseSync {
  if (singleton) return singleton;
  const path = resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("pragma journal_mode = WAL;");
  db.exec("pragma foreign_keys = ON;");
  db.exec(SCHEMA);
  singleton = db;
  return db;
}

let txnDepth = 0;

/**
 * Run `fn` inside a single SQLite transaction, rolling back on any error so a
 * partial failure never leaves a half-written store. Nested calls are flattened
 * onto the outermost transaction.
 */
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  if (txnDepth > 0) return fn();
  db.exec("begin");
  txnDepth += 1;
  try {
    const result = fn();
    db.exec("commit");
    return result;
  } catch (error) {
    db.exec("rollback");
    throw error;
  } finally {
    txnDepth -= 1;
  }
}

/** Drop every table — used by `seed --reset`. */
export function resetDb(): void {
  const db = getDb();
  db.exec(`
    drop table if exists activity_log;
    drop table if exists escalations;
    drop table if exists messages;
    drop table if exists conversations;
    drop table if exists care_instructions;
    drop table if exists itinerary_events;
    drop table if exists source_documents;
    drop table if exists patients;
  `);
  db.exec(SCHEMA);
}

import Constants from "expo-constants";
import { demoPayload } from "./demo-payload";
import type { PatientCardPayload } from "./types";

const extra = Constants.expoConfig?.extra as
  | { cardApiUrl?: string }
  | undefined;

export const cardApiUrl =
  process.env.EXPO_PUBLIC_CARD_API_URL ??
  extra?.cardApiUrl ??
  "http://127.0.0.1:3211/miniapp/card";

const documentApiUrl = cardApiUrl.replace(/\/card$/, "/document");

export async function loadPatientCard(
  token: string
): Promise<PatientCardPayload> {
  if (token === "demo") {
    return demoPayload;
  }
  const response = await fetch(
    `${cardApiUrl}?token=${encodeURIComponent(token)}`
  );
  if (response.status === 410) {
    throw new Error("This card link has expired. Ask Essos for a fresh one.");
  }
  if (!response.ok) {
    throw new Error("We could not open this card link.");
  }
  return normalizePatientCardPayload(
    (await response.json()) as PatientCardPayload
  );
}

function normalizePatientCardPayload(
  payload: PatientCardPayload
): PatientCardPayload {
  return {
    ...payload,
    documents: Array.isArray(payload.documents) ? payload.documents : [],
    sources: Array.isArray(payload.sources) ? payload.sources : [],
  };
}

export function patientDocumentRoute(
  token: string,
  documentId: string
): string {
  return `/p/${encodeURIComponent(token)}/docs/${encodeURIComponent(
    documentId
  )}`;
}

export function patientDocumentsRoute(token: string): string {
  return `/p/${encodeURIComponent(token)}/docs`;
}

export function patientDocumentUrl(
  token: string,
  documentId: string,
  options: { download?: boolean } = {}
): string {
  if (token === "demo") {
    return patientDocumentRoute(token, documentId);
  }
  const params = new URLSearchParams({
    documentId,
    token,
  });
  if (options.download) {
    params.set("download", "1");
  }
  return `${documentApiUrl}?${params.toString()}`;
}

import {
  createPatientCardLink,
  getConversationById,
  getPatientById,
  type PatientCardLink,
  type PatientCardPurpose,
} from "@essos/shared";
import { PATIENT_CARD_TTL_MINUTES, PATIENT_MINIAPP_BASE_URL } from "./env.js";

const CARD_TOKEN =
  /\[\[\s*essos_card\s*:\s*(itinerary|clinic|source_data)\s*\]\]/gi;

const LABELS: Record<PatientCardPurpose, string> = {
  itinerary: "itinerary card",
  clinic: "clinic card",
  source_data: "source data card",
};

export interface PatientCardExtraction {
  purposes: PatientCardPurpose[];
  text: string;
}

export function extractPatientCardRequests(raw: string): PatientCardExtraction {
  const purposes: PatientCardPurpose[] = [];
  const text = raw.replace(CARD_TOKEN, (_match, purpose: string) => {
    const normalized = purpose.toLowerCase() as PatientCardPurpose;
    if (!purposes.includes(normalized)) {
      purposes.push(normalized);
    }
    return "";
  });
  return {
    purposes,
    text: text.replace(/\n{3,}/g, "\n\n").trim(),
  };
}

export function formatPatientCardLink(link: PatientCardLink): string {
  return `Open your ${LABELS[link.purpose]}: ${link.url}`;
}

export async function createLinksForConversation(
  conversationId: string,
  purposes: PatientCardPurpose[]
): Promise<PatientCardLink[]> {
  if (purposes.length === 0) {
    return [];
  }
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    return [];
  }
  const patient = await getPatientById(conversation.patient_id);
  if (!patient) {
    return [];
  }
  const links: PatientCardLink[] = [];
  for (const purpose of purposes) {
    links.push(
      await createPatientCardLink({
        patientId: patient.id,
        conversationId,
        purpose,
        ttlMinutes: PATIENT_CARD_TTL_MINUTES,
        baseUrl: PATIENT_MINIAPP_BASE_URL,
      })
    );
  }
  return links;
}

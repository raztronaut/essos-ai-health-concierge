import { defineTool } from "eve/tools";
import { listItinerary, getPatientById } from "@essos/shared";
import { z } from "zod";

/**
 * Read the patient's itinerary (source of truth for flights, pickups, hotel,
 * appointments, follow-ups, reservation/confirmation numbers, driver contact).
 */
export default defineTool({
  description:
    "Get the patient's travel itinerary: flights, hotel, clinic appointments, transport/driver details, follow-ups, and reservation/confirmation numbers. This is the source of truth for any logistics or schedule question. Pass the patient_id from the conversation context block.",
  inputSchema: z.object({
    patient_id: z.string().min(1).describe("The patient_id from the context block."),
  }),
  async execute({ patient_id }) {
    const patient = getPatientById(patient_id);
    if (!patient) {
      return { found: false as const, reason: "No patient matches that id." };
    }
    const events = listItinerary(patient_id).map((event) => ({
      kind: event.kind,
      title: event.title,
      detail: event.detail,
      location: event.location,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      confirmation_number: event.confirmation_number,
      driver_name: event.driver_name,
      driver_phone: event.driver_phone,
    }));
    return {
      found: true as const,
      patient: {
        name: patient.name,
        procedure: patient.procedure,
        destination: `${patient.destination_city}, ${patient.destination_country}`,
        clinic: patient.clinic_name,
        hotel: patient.hotel_name,
        companion: patient.companion_name,
      },
      events,
    };
  },
});

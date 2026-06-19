import { defineTool } from "eve/tools";
import { z } from "zod";
import { getPatientById } from "@essos/shared";

export default defineTool({
  description:
    "Get a patient's profile: name, procedure, destination, clinic, hotel, companion, and dietary notes. Call this first to ground your answer in who you're helping.",
  inputSchema: z.object({
    patient_id: z.string().min(1).describe("patient_id from the ESSOS_CONTEXT block"),
  }),
  async execute({ patient_id }) {
    const p = await getPatientById(patient_id);
    if (!p) return { found: false as const, patient_id };
    return {
      found: true as const,
      name: p.name,
      procedure: p.procedure,
      destination_city: p.destination_city,
      destination_country: p.destination_country,
      clinic_name: p.clinic_name,
      hotel_name: p.hotel_name,
      companion_name: p.companion_name,
      dietary_notes: p.dietary_notes,
    };
  },
});

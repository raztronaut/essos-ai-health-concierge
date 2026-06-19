import { defineTool } from "eve/tools";
import { z } from "zod";
import { getPatientById, searchLocalPlaces } from "@essos/shared";

export default defineTool({
  description:
    "Find local places near the patient's destination city: restaurants, pharmacies, ATMs, groceries, coffee, currency exchange. Uses Google Places when configured, otherwise curated local results. Pass the patient_id so the city is inferred from their itinerary.",
  inputSchema: z.object({
    patient_id: z.string().min(1).describe("patient_id from the ESSOS_CONTEXT block"),
    query: z
      .string()
      .min(1)
      .describe("what to look for, e.g. 'pescatarian restaurant', 'pharmacy', 'ATM'"),
    city: z
      .string()
      .optional()
      .describe("override the city; defaults to the patient's destination city"),
  }),
  async execute({ patient_id, query, city }) {
    const patient = getPatientById(patient_id);
    const resolvedCity = city ?? patient?.destination_city ?? "";
    const { results, source } = await searchLocalPlaces({
      query,
      city: resolvedCity,
    });
    return {
      city: resolvedCity,
      source,
      results,
    };
  },
});

import { defineTool } from "eve/tools";
import { listItinerary, getPatientById } from "@essos/shared";
import { z } from "zod";

/**
 * Read the patient's itinerary (source of truth for flights, pickups, hotel,
 * appointments, follow-ups, reservation/confirmation numbers, driver contact).
 *
 * The patient profile lives in `get_patient_overview`; this tool returns only
 * the schedule. Null fields are dropped so the model context stays minimal, and
 * `outputSchema` pins the contract. See the tool minimization note in the Eve
 * docs (`tools/overview.mdx`).
 */
const itineraryEvent = z.object({
  kind: z.string(),
  title: z.string(),
  detail: z.string().optional(),
  location: z.string().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  confirmation_number: z.string().optional(),
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),
});

export default defineTool({
  description:
    "Get the patient's travel itinerary: flights, hotel, clinic appointments, transport/driver details, follow-ups, and reservation/confirmation numbers. This is the source of truth for any logistics or schedule question. Pass the patient_id from the ESSOS_CONTEXT block.",
  inputSchema: z.object({
    patient_id: z
      .string()
      .min(1)
      .describe("The patient_id from the ESSOS_CONTEXT block."),
  }),
  outputSchema: z.discriminatedUnion("found", [
    z.object({ found: z.literal(true), events: z.array(itineraryEvent) }),
    z.object({ found: z.literal(false), reason: z.string() }),
  ]),
  async execute({ patient_id }) {
    const patient = getPatientById(patient_id);
    if (!patient) {
      return { found: false as const, reason: "No patient matches that id." };
    }
    const events = listItinerary(patient_id).map((event) => ({
      kind: event.kind,
      title: event.title,
      // Drop null fields so only present itinerary data reaches the model.
      ...optional("detail", event.detail),
      ...optional("location", event.location),
      ...optional("starts_at", event.starts_at),
      ...optional("ends_at", event.ends_at),
      ...optional("confirmation_number", event.confirmation_number),
      ...optional("driver_name", event.driver_name),
      ...optional("driver_phone", event.driver_phone),
    }));
    return { found: true as const, events };
  },
});

/** Yield `{ [key]: value }` only when the value is non-null, for spreading. */
function optional<K extends string, V>(
  key: K,
  value: V | null | undefined,
): Record<K, V> | Record<string, never> {
  return value == null ? {} : ({ [key]: value } as Record<K, V>);
}

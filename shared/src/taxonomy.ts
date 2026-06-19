/**
 * Escalation taxonomy — see docs/decisions/001-escalation-taxonomy.md.
 *
 * Every patient message is classified into exactly one category. The category
 * determines whether Eve may answer autonomously and, if it must escalate, the
 * default priority level.
 */

export type EscalationLevel = "High" | "Med";

export type EscalationCategory =
  | "itinerary_reference"
  | "travel_logistics"
  | "local_recommendation"
  | "documented_preop_reference"
  | "medication_decision"
  | "postop_symptom_or_recovery"
  | "medical_or_clinical_judgment"
  | "staff_safety_or_quality"
  | "out_of_package_request"
  | "missing_source_or_unsure";

export interface CategoryPolicy {
  /** Whether Eve may respond without a human, at least for routine cases. */
  autonomous: boolean;
  category: EscalationCategory;
  /** Default escalation level when this category requires a human. */
  defaultLevel: EscalationLevel | null;
  description: string;
  label: string;
}

export const CATEGORY_POLICIES: Record<EscalationCategory, CategoryPolicy> = {
  itinerary_reference: {
    category: "itinerary_reference",
    autonomous: true,
    defaultLevel: null,
    label: "Itinerary reference",
    description:
      "Pickups, flights, hotel, appointments, reservation info, follow-ups. Answer from itinerary source of truth.",
  },
  travel_logistics: {
    category: "travel_logistics",
    autonomous: true,
    defaultLevel: "Med",
    label: "Travel logistics",
    description:
      "Flight delays, early arrival, driver updates, transport confirmations. Escalate if the patient is blocked or stranded.",
  },
  local_recommendation: {
    category: "local_recommendation",
    autonomous: true,
    defaultLevel: null,
    label: "Local recommendation",
    description:
      "Restaurants, pharmacies, ATMs, grocery, coffee, currency exchange, general area suggestions.",
  },
  documented_preop_reference: {
    category: "documented_preop_reference",
    autonomous: true,
    defaultLevel: null,
    label: "Documented pre-op reference",
    description:
      "Quote or summarize documented pre-op instructions only. No clinical judgment.",
  },
  medication_decision: {
    category: "medication_decision",
    autonomous: false,
    defaultLevel: "High",
    label: "Medication decision",
    description:
      "Whether to take, stop, combine, replace, or resume medication or supplements. Always escalate.",
  },
  postop_symptom_or_recovery: {
    category: "postop_symptom_or_recovery",
    autonomous: false,
    defaultLevel: "High",
    label: "Post-op symptom or recovery",
    description:
      "Pain, bleeding, fever, swelling, nausea, showering, flying, sleeping, exercise, foods, glasses, contacts.",
  },
  medical_or_clinical_judgment: {
    category: "medical_or_clinical_judgment",
    autonomous: false,
    defaultLevel: "High",
    label: "Medical or clinical judgment",
    description:
      "Diagnosis, normal-vs-concerning judgment, treatment advice, anesthesia, infection, complications, emergencies.",
  },
  staff_safety_or_quality: {
    category: "staff_safety_or_quality",
    autonomous: false,
    defaultLevel: "High",
    label: "Staff safety or quality",
    description:
      "Hospital/clinic staff concerns, hygiene, unsafe behavior, or a patient feeling uncomfortable with care.",
  },
  out_of_package_request: {
    category: "out_of_package_request",
    autonomous: false,
    defaultLevel: "Med",
    label: "Out-of-package request",
    description:
      "Extra procedure, extra nights, unscheduled transport, added companion services — likely requires approval.",
  },
  missing_source_or_unsure: {
    category: "missing_source_or_unsure",
    autonomous: false,
    defaultLevel: "Med",
    label: "Missing source or unsure",
    description:
      "No reliable source, low confidence, or the patient asks something outside loaded data. Escalate, do not improvise.",
  },
};

export const ALL_CATEGORIES = Object.keys(
  CATEGORY_POLICIES
) as EscalationCategory[];

/**
 * Categories that can legitimately be filed as an escalation: everything that
 * must escalate, plus `travel_logistics` (autonomous for routine updates, but
 * escalates when the patient is blocked or stranded). The purely-autonomous
 * reference categories are excluded so an escalation can never cite them.
 */
export const ESCALATABLE_CATEGORIES = ALL_CATEGORIES.filter(
  (category) =>
    !CATEGORY_POLICIES[category].autonomous || category === "travel_logistics"
) as EscalationCategory[];

export function isEscalationCategory(
  value: string
): value is EscalationCategory {
  return value in CATEGORY_POLICIES;
}

export function categoryRequiresEscalation(
  category: EscalationCategory
): boolean {
  return !CATEGORY_POLICIES[category].autonomous;
}

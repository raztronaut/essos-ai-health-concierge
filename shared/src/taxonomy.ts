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

// ---------------------------------------------------------------------------
// Per-patient policy overrides (tighten-only) — see ADR 021.
//
// The global `CATEGORY_POLICIES` are the conservative default for every
// patient. A patient may carry overrides that make Eve *more* cautious for
// them specifically — never less. This is the safety invariant of the whole
// feature: an override can force a normally-autonomous category to escalate
// and can raise a Med flag to High, but it can never make a category
// autonomous or lower a level. A clinical guardrail can only ever tighten.
// ---------------------------------------------------------------------------

/**
 * A single per-patient override of the global taxonomy for one category.
 * Tighten-only by construction: there is no field that loosens a guardrail.
 */
export interface PatientPolicyOverride {
  category: EscalationCategory;
  /**
   * Force a normally-autonomous category (e.g. `travel_logistics`) to escalate
   * for this patient. Has no effect on categories that already escalate — you
   * cannot use `false` here to make a clinical category autonomous.
   */
  force_escalate?: boolean;
  /** Raise the escalation level for this category. Only ever raises (Med -> High); never lowers. */
  level?: EscalationLevel;
}

const LEVEL_RANK: Record<EscalationLevel, number> = { Med: 1, High: 2 };

/** The stricter (higher-priority) of two levels. */
export function higherLevel(
  a: EscalationLevel,
  b: EscalationLevel
): EscalationLevel {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}

/**
 * Resolve the effective policy for a category given a patient's overrides.
 * Tighten-only: the result is never more permissive than the global default.
 */
export function resolvePatientPolicy(
  category: EscalationCategory,
  overrides?: readonly PatientPolicyOverride[] | null
): CategoryPolicy {
  const base = CATEGORY_POLICIES[category];
  const override = overrides?.find((o) => o.category === category);
  if (!override) {
    return base;
  }

  let autonomous = base.autonomous;
  let defaultLevel = base.defaultLevel;

  // Tighten only: a normally-autonomous category can be forced to escalate.
  // `force_escalate === false` is ignored — it can never make a clinical
  // category autonomous.
  if (override.force_escalate === true && autonomous) {
    autonomous = false;
    defaultLevel = override.level ?? defaultLevel ?? "Med";
  }

  // A level override only ever raises, and only matters once escalating.
  if (!autonomous && override.level) {
    defaultLevel = higherLevel(defaultLevel ?? "Med", override.level);
  }

  return { ...base, autonomous, defaultLevel };
}

/** The full per-patient effective policy map (global defaults + overrides). */
export function resolvePatientPolicies(
  overrides?: readonly PatientPolicyOverride[] | null
): Record<EscalationCategory, CategoryPolicy> {
  const out = {} as Record<EscalationCategory, CategoryPolicy>;
  for (const category of ALL_CATEGORIES) {
    out[category] = resolvePatientPolicy(category, overrides);
  }
  return out;
}

/**
 * Drop no-op / invalid / loosening entries so only real tightenings persist.
 * Keeps one entry per category. Used by the mutation and the dashboard so the
 * stored overrides are always meaningful and minimal.
 */
export function sanitizePolicyOverrides(
  overrides: readonly PatientPolicyOverride[] | null | undefined
): PatientPolicyOverride[] {
  if (!overrides) {
    return [];
  }
  const byCategory = new Map<EscalationCategory, PatientPolicyOverride>();
  for (const raw of overrides) {
    if (!isEscalationCategory(raw.category)) {
      continue;
    }
    const base = CATEGORY_POLICIES[raw.category];
    const forces = raw.force_escalate === true && base.autonomous;
    // A level bump only tightens when the (resolved) category escalates and the
    // bump is strictly higher than the current default.
    const escalates = forces || !base.autonomous;
    const raises =
      raw.level !== undefined &&
      escalates &&
      higherLevel(base.defaultLevel ?? "Med", raw.level) === raw.level &&
      raw.level !== (base.defaultLevel ?? "Med");
    if (!(forces || raises)) {
      continue;
    }
    const entry: PatientPolicyOverride = { category: raw.category };
    if (forces) {
      entry.force_escalate = true;
    }
    if (raises) {
      entry.level = raw.level;
    }
    byCategory.set(raw.category, entry);
  }
  return [...byCategory.values()];
}

/**
 * A compact one-line-per-category summary of how a patient's overrides differ
 * from the global default, for the trusted agent context header and the
 * dashboard. Returns null when nothing differs.
 */
export function summarizePolicyOverrides(
  overrides?: readonly PatientPolicyOverride[] | null
): string | null {
  const clean = sanitizePolicyOverrides(overrides);
  if (clean.length === 0) {
    return null;
  }
  const parts = clean.map((o) => {
    const resolved = resolvePatientPolicy(o.category, clean);
    const bits: string[] = [];
    if (o.force_escalate && CATEGORY_POLICIES[o.category].autonomous) {
      bits.push("always escalate");
    }
    if (resolved.defaultLevel) {
      bits.push(`level ${resolved.defaultLevel}`);
    }
    return `${o.category} (${bits.join(", ")})`;
  });
  return parts.join("; ");
}

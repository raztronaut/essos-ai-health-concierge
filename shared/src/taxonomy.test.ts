import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CATEGORY_POLICIES,
  higherLevel,
  type PatientPolicyOverride,
  resolvePatientPolicy,
  sanitizePolicyOverrides,
  summarizePolicyOverrides,
} from "./taxonomy.js";

test("no overrides returns the global default unchanged", () => {
  assert.deepEqual(
    resolvePatientPolicy("travel_logistics"),
    CATEGORY_POLICIES.travel_logistics
  );
  assert.deepEqual(
    resolvePatientPolicy("medication_decision", []),
    CATEGORY_POLICIES.medication_decision
  );
});

test("force_escalate tightens an autonomous category to escalate", () => {
  const overrides: PatientPolicyOverride[] = [
    { category: "travel_logistics", force_escalate: true },
  ];
  const resolved = resolvePatientPolicy("travel_logistics", overrides);
  assert.equal(resolved.autonomous, false);
  // travel_logistics has a Med default; forcing keeps it at least Med.
  assert.equal(resolved.defaultLevel, "Med");
});

test("force_escalate on a category with no default level falls back to Med", () => {
  const overrides: PatientPolicyOverride[] = [
    { category: "local_recommendation", force_escalate: true },
  ];
  const resolved = resolvePatientPolicy("local_recommendation", overrides);
  assert.equal(resolved.autonomous, false);
  assert.equal(resolved.defaultLevel, "Med");
});

test("INVARIANT: an override can never make a clinical category autonomous", () => {
  // force_escalate:false must be ignored for an already-escalating category.
  const overrides: PatientPolicyOverride[] = [
    { category: "medication_decision", force_escalate: false },
  ];
  const resolved = resolvePatientPolicy("medication_decision", overrides);
  assert.equal(resolved.autonomous, false, "medication must stay escalating");
});

test("INVARIANT: a level override can only raise, never lower", () => {
  // Try to lower a High clinical category to Med — must be ignored.
  const lower: PatientPolicyOverride[] = [
    { category: "medication_decision", level: "Med" },
  ];
  assert.equal(
    resolvePatientPolicy("medication_decision", lower).defaultLevel,
    "High",
    "High must not be lowered to Med"
  );

  // Raising a Med category to High is allowed.
  const raise: PatientPolicyOverride[] = [
    { category: "out_of_package_request", level: "High" },
  ];
  assert.equal(
    resolvePatientPolicy("out_of_package_request", raise).defaultLevel,
    "High"
  );
});

test("higherLevel returns the stricter level", () => {
  assert.equal(higherLevel("Med", "High"), "High");
  assert.equal(higherLevel("High", "Med"), "High");
  assert.equal(higherLevel("Med", "Med"), "Med");
});

test("sanitizePolicyOverrides drops no-ops and loosening attempts", () => {
  const dirty: PatientPolicyOverride[] = [
    { category: "medication_decision", force_escalate: false }, // no-op (already escalates)
    { category: "medication_decision", level: "Med" }, // loosening (current High)
    { category: "itinerary_reference" }, // empty
    { category: "travel_logistics", force_escalate: true }, // real tighten
    { category: "out_of_package_request", level: "High" }, // real raise
    { category: "not_a_category" as unknown as "itinerary_reference" }, // invalid
  ];
  const clean = sanitizePolicyOverrides(dirty);
  const categories = clean.map((o) => o.category).sort();
  assert.deepEqual(categories, ["out_of_package_request", "travel_logistics"]);
});

test("summarizePolicyOverrides is null when nothing tightens", () => {
  assert.equal(summarizePolicyOverrides([]), null);
  assert.equal(
    summarizePolicyOverrides([
      { category: "medication_decision", force_escalate: false },
    ]),
    null
  );
});

test("summarizePolicyOverrides describes the tightenings", () => {
  const summary = summarizePolicyOverrides([
    { category: "travel_logistics", force_escalate: true },
  ]);
  assert.ok(summary?.includes("travel_logistics"));
  assert.ok(summary?.includes("always escalate"));
});

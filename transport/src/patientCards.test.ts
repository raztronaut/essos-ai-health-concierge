import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractPatientCardRequests,
  formatPatientCardLink,
} from "./patientCards.js";

test("extractPatientCardRequests: strips itinerary card token", () => {
  const out = extractPatientCardRequests(
    "Here you go.\n\n[[essos_card:itinerary]]"
  );
  assert.equal(out.text, "Here you go.");
  assert.deepEqual(out.purposes, ["itinerary"]);
});

test("extractPatientCardRequests: dedupes repeated card tokens", () => {
  const out = extractPatientCardRequests(
    "[[essos_card:clinic]]\n[[essos_card:clinic]]\n[[essos_card:source_data]]"
  );
  assert.equal(out.text, "");
  assert.deepEqual(out.purposes, ["clinic", "source_data"]);
});

test("extractPatientCardRequests: leaves ordinary text alone", () => {
  const input = "Your pickup is at 10:00.";
  assert.deepEqual(extractPatientCardRequests(input), {
    text: input,
    purposes: [],
  });
});

test("formatPatientCardLink: creates a patient-friendly fallback bubble", () => {
  assert.equal(
    formatPatientCardLink({
      expiresAt: "2026-06-19T12:00:00.000Z",
      path: "/p/tok",
      purpose: "itinerary",
      token: "tok",
      url: "https://mini.essos.dev/p/tok",
    }),
    "Open your itinerary card: https://mini.essos.dev/p/tok"
  );
});

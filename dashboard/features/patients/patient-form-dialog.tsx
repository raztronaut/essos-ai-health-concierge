"use client";

import { api } from "@convex/_generated/api";
import type { Patient, Procedure } from "@essos/shared";
import { useMutation } from "convex/react";
import { useState } from "react";
import {
  Button,
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { PROCEDURE_OPTIONS } from "./options";

interface FormState {
  clinic_name: string;
  companion_name: string;
  destination_city: string;
  destination_country: string;
  dietary_notes: string;
  handle: string;
  hotel_name: string;
  name: string;
  procedure: Procedure;
}

function initialState(patient?: Patient | null): FormState {
  return {
    name: patient?.name ?? "",
    handle: patient?.handle ?? "",
    procedure: patient?.procedure ?? "rhinoplasty",
    destination_city: patient?.destination_city ?? "",
    destination_country: patient?.destination_country ?? "",
    clinic_name: patient?.clinic_name ?? "",
    hotel_name: patient?.hotel_name ?? "",
    companion_name: patient?.companion_name ?? "",
    dietary_notes: patient?.dietary_notes ?? "",
  };
}

/** Create (no `patient`) or edit (with `patient`) a patient's core profile. */
export function PatientFormDialog({
  open,
  onClose,
  patient,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  patient?: Patient | null;
  onSaved?: (patientId: string) => void;
}) {
  const { viewAs } = useDemoIdentity();
  const upsert = useMutation(api.mutations.upsertPatient);
  const [form, setForm] = useState<FormState>(() => initialState(patient));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!(form.name.trim() && form.handle.trim())) {
      setError("Name and handle are required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const id = await upsert({
        id: patient?.id,
        name: form.name.trim(),
        handle: form.handle.trim(),
        procedure: form.procedure,
        destination_city: form.destination_city.trim(),
        destination_country: form.destination_country.trim(),
        clinic_name: form.clinic_name.trim(),
        hotel_name: form.hotel_name.trim(),
        companion_name: form.companion_name.trim() || null,
        dietary_notes: form.dietary_notes.trim() || null,
        viewAs,
      });
      onSaved?.(id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save patient.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      description={
        patient
          ? "Update this patient's profile. Eve uses these fields immediately."
          : "Create a new patient record. Eve can reference it right away."
      }
      footer={
        <>
          <Button disabled={pending} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button disabled={pending} onClick={handleSubmit} variant="primary">
            {pending ? "Saving…" : patient ? "Save changes" : "Create patient"}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title={patient ? "Edit patient" : "New patient"}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input
            onChange={(e) => set("name", e.target.value)}
            placeholder="Maya Okafor"
            value={form.name}
          />
        </Field>
        <Field hint="iMessage / phone handle" label="Handle">
          <Input
            onChange={(e) => set("handle", e.target.value)}
            placeholder="+15551234567"
            value={form.handle}
          />
        </Field>
        <Field label="Procedure">
          <Select
            onChange={(e) => set("procedure", e.target.value as Procedure)}
            value={form.procedure}
          >
            {PROCEDURE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Clinic">
          <Input
            onChange={(e) => set("clinic_name", e.target.value)}
            value={form.clinic_name}
          />
        </Field>
        <Field label="Destination city">
          <Input
            onChange={(e) => set("destination_city", e.target.value)}
            value={form.destination_city}
          />
        </Field>
        <Field label="Destination country">
          <Input
            onChange={(e) => set("destination_country", e.target.value)}
            value={form.destination_country}
          />
        </Field>
        <Field label="Hotel">
          <Input
            onChange={(e) => set("hotel_name", e.target.value)}
            value={form.hotel_name}
          />
        </Field>
        <Field label="Companion">
          <Input
            onChange={(e) => set("companion_name", e.target.value)}
            placeholder="Optional"
            value={form.companion_name}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Dietary notes">
            <Textarea
              onChange={(e) => set("dietary_notes", e.target.value)}
              placeholder="Optional"
              value={form.dietary_notes}
            />
          </Field>
        </div>
      </div>
      {error ? <p className="mt-3 text-high text-sm">{error}</p> : null}
    </Dialog>
  );
}

"use client";

import { api } from "@convex/_generated/api";
import type { Patient, Procedure } from "@essos/shared";
import { useMutation } from "convex/react";
import { useState } from "react";
import {
  Dialog,
  DialogForm,
  Field,
  Input,
  Select,
  Textarea,
  useDialogForm,
} from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { PROCEDURE_OPTIONS } from "./options";

interface FormState {
  assignee_user_id: string;
  associated_user_ids: string[];
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
    assignee_user_id: patient?.assignee_user_id ?? "",
    associated_user_ids: patient?.associated_user_ids ?? [],
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
  const { viewAs, concierges } = useDemoIdentity();
  const upsert = useMutation(api.mutations.upsertPatient);
  const [form, setForm] = useState<FormState>(() => initialState(patient));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const { pending, error, handleSubmit } = useDialogForm(
    async (formData: FormState) => {
      if (!(formData.name.trim() && formData.handle.trim())) {
        throw new Error("Name and handle are required.");
      }
      return await upsert({
        id: patient?.id,
        name: formData.name.trim(),
        handle: formData.handle.trim(),
        procedure: formData.procedure,
        destination_city: formData.destination_city.trim(),
        destination_country: formData.destination_country.trim(),
        clinic_name: formData.clinic_name.trim(),
        hotel_name: formData.hotel_name.trim(),
        companion_name: formData.companion_name.trim() || null,
        dietary_notes: formData.dietary_notes.trim() || null,
        assignee_user_id: formData.assignee_user_id || null,
        associated_user_ids: formData.associated_user_ids,
        viewAs,
      });
    },
    (id) => {
      onSaved?.(id);
      onClose();
    }
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(form).catch(() => {});
  };

  return (
    <Dialog
      description={
        patient
          ? "Update this patient's profile. Eve uses these fields immediately."
          : "Create a new patient record. Eve can reference it right away."
      }
      onClose={onClose}
      open={open}
      title={patient ? "Edit patient" : "New patient"}
    >
      <DialogForm
        error={error}
        onClose={onClose}
        onSubmit={onSubmit}
        pending={pending}
        submitLabel={patient ? "Save changes" : "Create patient"}
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
          <Field label="Owner">
            <Select
              onChange={(e) => set("assignee_user_id", e.target.value)}
              value={form.assignee_user_id}
            >
              <option value="">Unassigned</option>
              {concierges.map((c) => (
                <option key={c.clerkId} value={c.clerkId}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Associated Concierge Members">
              <div className="grid grid-cols-2 gap-2 rounded-control border border-border bg-surface/20 p-3">
                {concierges.map((c) => {
                  const isChecked = form.associated_user_ids.includes(
                    c.clerkId
                  );
                  return (
                    <label
                      className="flex cursor-pointer select-none items-center gap-2 font-medium text-ink text-xs"
                      key={c.clerkId}
                    >
                      <input
                        checked={isChecked}
                        className="size-3.5 rounded border-border text-primary focus:ring-primary"
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.associated_user_ids, c.clerkId]
                            : form.associated_user_ids.filter(
                                (id) => id !== c.clerkId
                              );
                          set("associated_user_ids", next);
                        }}
                        type="checkbox"
                      />
                      <span>{c.name}</span>
                    </label>
                  );
                })}
              </div>
            </Field>
          </div>
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
      </DialogForm>
    </Dialog>
  );
}

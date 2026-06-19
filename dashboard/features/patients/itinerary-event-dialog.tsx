"use client";

import { api } from "@convex/_generated/api";
import type { ItineraryEvent, ItineraryKind } from "@essos/shared";
import { useMutation } from "convex/react";
import { useState } from "react";
import {
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
  DialogForm,
  useDialogForm,
} from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { ITINERARY_KIND_OPTIONS } from "./options";

/** Trim an ISO timestamp to the `YYYY-MM-DDTHH:mm` a datetime-local input wants. */
function toLocalInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.slice(0, 16);
}

interface ItineraryFormState {
  kind: ItineraryKind;
  title: string;
  detail: string;
  location: string;
  startsAt: string;
  endsAt: string;
  confirmation: string;
  driverName: string;
  driverPhone: string;
  sortOrder: string;
}

export function ItineraryEventDialog({
  open,
  onClose,
  patientId,
  event,
}: {
  open: boolean;
  onClose: () => void;
  patientId: string;
  event?: ItineraryEvent | null;
}) {
  const { viewAs } = useDemoIdentity();
  const upsert = useMutation(api.mutations.upsertItineraryEvent);

  const [form, setForm] = useState<ItineraryFormState>({
    kind: event?.kind ?? "flight",
    title: event?.title ?? "",
    detail: event?.detail ?? "",
    location: event?.location ?? "",
    startsAt: toLocalInput(event?.starts_at),
    endsAt: toLocalInput(event?.ends_at),
    confirmation: event?.confirmation_number ?? "",
    driverName: event?.driver_name ?? "",
    driverPhone: event?.driver_phone ?? "",
    sortOrder: String(event?.sort_order ?? 0),
  });

  const set = <K extends keyof ItineraryFormState>(key: K, value: ItineraryFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const { pending, error, handleSubmit } = useDialogForm(
    async (formData: ItineraryFormState) => {
      if (!formData.title.trim()) {
        throw new Error("Title is required.");
      }
      return await upsert({
        id: event?.id,
        patientId,
        kind: formData.kind,
        title: formData.title.trim(),
        detail: formData.detail.trim() || null,
        location: formData.location.trim() || null,
        starts_at: formData.startsAt || null,
        ends_at: formData.endsAt || null,
        confirmation_number: formData.confirmation.trim() || null,
        driver_name: formData.driverName.trim() || null,
        driver_phone: formData.driverPhone.trim() || null,
        sort_order: Number(formData.sortOrder) || 0,
        viewAs,
      });
    },
    () => onClose()
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(form).catch(() => {});
  };

  return (
    <Dialog
      onClose={onClose}
      open={open}
      title={event ? "Edit itinerary event" : "Add itinerary event"}
    >
      <DialogForm
        error={error}
        onClose={onClose}
        onSubmit={onSubmit}
        pending={pending}
        submitLabel="Save"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select
              onChange={(e) => set("kind", e.target.value as ItineraryKind)}
              value={form.kind}
            >
              {ITINERARY_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort order">
            <Input
              onChange={(e) => set("sortOrder", e.target.value)}
              type="number"
              value={form.sortOrder}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Title">
              <Input
                onChange={(e) => set("title", e.target.value)}
                placeholder="TK0091 IST → ..."
                value={form.title}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Detail">
              <Textarea
                onChange={(e) => set("detail", e.target.value)}
                value={form.detail}
              />
            </Field>
          </div>
          <Field label="Starts at">
            <Input
              onChange={(e) => set("startsAt", e.target.value)}
              type="datetime-local"
              value={form.startsAt}
            />
          </Field>
          <Field label="Ends at">
            <Input
              onChange={(e) => set("endsAt", e.target.value)}
              type="datetime-local"
              value={form.endsAt}
            />
          </Field>
          <Field label="Location">
            <Input
              onChange={(e) => set("location", e.target.value)}
              value={form.location}
            />
          </Field>
          <Field label="Confirmation #">
            <Input
              onChange={(e) => set("confirmation", e.target.value)}
              value={form.confirmation}
            />
          </Field>
          <Field label="Driver name">
            <Input
              onChange={(e) => set("driverName", e.target.value)}
              value={form.driverName}
            />
          </Field>
          <Field label="Driver phone">
            <Input
              onChange={(e) => set("driverPhone", e.target.value)}
              value={form.driverPhone}
            />
          </Field>
        </div>
      </DialogForm>
    </Dialog>
  );
}

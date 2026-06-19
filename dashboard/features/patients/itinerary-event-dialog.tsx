"use client";

import { api } from "@convex/_generated/api";
import type { ItineraryEvent, ItineraryKind } from "@essos/shared";
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
import { ITINERARY_KIND_OPTIONS } from "./options";

/** Trim an ISO timestamp to the `YYYY-MM-DDTHH:mm` a datetime-local input wants. */
function toLocalInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.slice(0, 16);
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
  const [kind, setKind] = useState<ItineraryKind>(event?.kind ?? "flight");
  const [title, setTitle] = useState(event?.title ?? "");
  const [detail, setDetail] = useState(event?.detail ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.starts_at));
  const [endsAt, setEndsAt] = useState(toLocalInput(event?.ends_at));
  const [confirmation, setConfirmation] = useState(
    event?.confirmation_number ?? ""
  );
  const [driverName, setDriverName] = useState(event?.driver_name ?? "");
  const [driverPhone, setDriverPhone] = useState(event?.driver_phone ?? "");
  const [sortOrder, setSortOrder] = useState(String(event?.sort_order ?? 0));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await upsert({
        id: event?.id,
        patientId,
        kind,
        title: title.trim(),
        detail: detail.trim() || null,
        location: location.trim() || null,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        confirmation_number: confirmation.trim() || null,
        driver_name: driverName.trim() || null,
        driver_phone: driverPhone.trim() || null,
        sort_order: Number(sortOrder) || 0,
        viewAs,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      footer={
        <>
          <Button disabled={pending} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button disabled={pending} onClick={handleSubmit} variant="primary">
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title={event ? "Edit itinerary event" : "Add itinerary event"}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Select
            onChange={(e) => setKind(e.target.value as ItineraryKind)}
            value={kind}
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
            onChange={(e) => setSortOrder(e.target.value)}
            type="number"
            value={sortOrder}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Title">
            <Input
              onChange={(e) => setTitle(e.target.value)}
              placeholder="TK0091 IST → ..."
              value={title}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Detail">
            <Textarea
              onChange={(e) => setDetail(e.target.value)}
              value={detail}
            />
          </Field>
        </div>
        <Field label="Starts at">
          <Input
            onChange={(e) => setStartsAt(e.target.value)}
            type="datetime-local"
            value={startsAt}
          />
        </Field>
        <Field label="Ends at">
          <Input
            onChange={(e) => setEndsAt(e.target.value)}
            type="datetime-local"
            value={endsAt}
          />
        </Field>
        <Field label="Location">
          <Input
            onChange={(e) => setLocation(e.target.value)}
            value={location}
          />
        </Field>
        <Field label="Confirmation #">
          <Input
            onChange={(e) => setConfirmation(e.target.value)}
            value={confirmation}
          />
        </Field>
        <Field label="Driver name">
          <Input
            onChange={(e) => setDriverName(e.target.value)}
            value={driverName}
          />
        </Field>
        <Field label="Driver phone">
          <Input
            onChange={(e) => setDriverPhone(e.target.value)}
            value={driverPhone}
          />
        </Field>
      </div>
      {error ? <p className="mt-3 text-high text-sm">{error}</p> : null}
    </Dialog>
  );
}

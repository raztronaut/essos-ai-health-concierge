"use client";

import { api } from "@convex/_generated/api";
import type { ItineraryEvent } from "@essos/shared";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button, Card, ConfirmDialog } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { formatDateTime } from "@/lib/format";
import { ItineraryEventDialog } from "./itinerary-event-dialog";

export function ItineraryTimeline({
  patientId,
  itinerary,
}: {
  patientId: string;
  itinerary: ItineraryEvent[];
}) {
  const { viewAs } = useDemoIdentity();
  const remove = useMutation(api.mutations.deleteItineraryEvent);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ItineraryEvent | null>(null);
  const [deleting, setDeleting] = useState<ItineraryEvent | null>(null);

  const sorted = [...itinerary].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      (a.starts_at ?? "").localeCompare(b.starts_at ?? "")
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Itinerary</h2>
        <Button onClick={() => setAdding(true)} variant="ghost">
          Add event
        </Button>
      </div>
      <Card>
        <ol className="space-y-4">
          {sorted.map((event) => (
            <li className="flex gap-3" key={event.id}>
              <div className="w-24 shrink-0 text-muted text-xs">
                {formatDateTime(event.starts_at)}
              </div>
              <div className="min-w-0 flex-1 border-border border-l pl-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted uppercase tracking-wide">
                      {event.kind}
                    </span>
                    <span className="font-medium">{event.title}</span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      onClick={() => setEditing(event)}
                      size="sm"
                      variant="ghost"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => setDeleting(event)}
                      size="sm"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                {event.detail ? (
                  <p className="mt-1 text-ink/80 text-sm">{event.detail}</p>
                ) : null}
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-muted text-xs">
                  {event.location ? <span>{event.location}</span> : null}
                  {event.confirmation_number ? (
                    <span>Conf# {event.confirmation_number}</span>
                  ) : null}
                  {event.driver_name ? (
                    <span>
                      Driver: {event.driver_name}
                      {event.driver_phone ? ` (${event.driver_phone})` : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
          {sorted.length === 0 ? (
            <li className="text-muted text-sm">No itinerary on file.</li>
          ) : null}
        </ol>
      </Card>

      {adding ? (
        <ItineraryEventDialog
          onClose={() => setAdding(false)}
          open={true}
          patientId={patientId}
        />
      ) : null}
      {editing ? (
        <ItineraryEventDialog
          event={editing}
          onClose={() => setEditing(null)}
          open={true}
          patientId={patientId}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          description={`Remove "${deleting.title}" from the itinerary?`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await remove({ id: deleting.id, viewAs });
          }}
          open={true}
          title="Remove event"
        />
      ) : null}
    </section>
  );
}

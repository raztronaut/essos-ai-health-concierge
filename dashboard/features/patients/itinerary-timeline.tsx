"use client";

import { api } from "@convex/_generated/api";
import type { ItineraryEvent } from "@essos/shared";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button, Card, ConfirmDialog, FoldTrigger } from "@/components/ui";
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
  const [expanded, setExpanded] = useState(false);

  const sorted = [...itinerary].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      (a.starts_at ?? "").localeCompare(b.starts_at ?? "")
  );

  const hasMore = sorted.length > 5;
  const visibleEvents = expanded ? sorted : sorted.slice(0, 5);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Itinerary</h2>
        <Button onClick={() => setAdding(true)} variant="ghost">
          Add event
        </Button>
      </div>
      <Card>
        {sorted.length === 0 ? (
          <p className="text-muted text-sm">No itinerary on file.</p>
        ) : (
          <div className="relative">
            {/* Continuous vertical timeline line */}
            <div className="absolute bottom-2 top-2 left-[106px] w-px bg-border/80" />

            <ol className="relative space-y-6">
              {visibleEvents.map((event) => (
                <li className="group relative flex gap-4" key={event.id}>
                  {/* Left: Starts At Timestamp */}
                  <div className="w-20 shrink-0 text-right text-meta tabular-nums pt-1">
                    {formatDateTime(event.starts_at)}
                  </div>

                  {/* Middle: Timeline Dot */}
                  <div className="relative z-10 flex w-5 shrink-0 justify-center pt-2">
                    <div className="size-2 rounded-full bg-card border-2 border-stone-90" />
                  </div>

                  {/* Right: Event Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted uppercase tracking-wide">
                          {event.kind}
                        </span>
                        <span className="font-medium text-sm text-ink">{event.title}</span>
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
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
                      <p className="mt-1 text-ink/80 text-sm leading-relaxed">{event.detail}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-meta">
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
            </ol>

            {hasMore ? (
              <FoldTrigger
                expanded={expanded}
                onToggle={() => setExpanded(!expanded)}
                count={sorted.length - 5}
                labelSingular="event"
                labelPlural="events"
              />
            ) : null}
          </div>
        )}
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

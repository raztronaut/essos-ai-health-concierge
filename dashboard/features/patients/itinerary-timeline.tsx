import type { ItineraryEvent } from "@essos/shared";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export function ItineraryTimeline({
  itinerary,
}: {
  itinerary: ItineraryEvent[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-lg">Itinerary</h2>
      <Card>
        <ol className="space-y-4">
          {itinerary.map((event) => (
            <li className="flex gap-3" key={event.id}>
              <div className="w-24 shrink-0 text-muted text-xs">
                {formatDateTime(event.starts_at)}
              </div>
              <div className="min-w-0 border-border border-l pl-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted uppercase tracking-wide">
                    {event.kind}
                  </span>
                  <span className="font-medium">{event.title}</span>
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
          {itinerary.length === 0 ? (
            <li className="text-muted text-sm">No itinerary on file.</li>
          ) : null}
        </ol>
      </Card>
    </section>
  );
}

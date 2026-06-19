import type { SourceDocument } from "@essos/shared";
import { Card } from "@/components/ui";
import { humanize } from "@/lib/format";

export function SourceDocuments({ docs }: { docs: SourceDocument[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Source documents</h2>
      <Card>
        <ul className="space-y-2 text-sm">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2">
              <a
                href={`/source-docs/${doc.id}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {doc.title}
              </a>
              <span className="shrink-0 text-xs text-muted">{humanize(doc.source_status)}</span>
            </li>
          ))}
          {docs.length === 0 ? <li className="text-muted">No documents.</li> : null}
        </ul>
      </Card>
    </section>
  );
}

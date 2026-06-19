import type { SourceDocument } from "@essos/shared";
import { Card } from "@/components/ui";
import { humanize } from "@/lib/format";

export function SourceDocuments({ docs }: { docs: SourceDocument[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-lg">Source documents</h2>
      <Card>
        <ul className="space-y-2 text-sm">
          {docs.map((doc) => (
            <li
              className="flex items-center justify-between gap-2"
              key={doc.id}
            >
              <a
                className="font-medium text-primary hover:underline"
                href={`/source-docs/${doc.id}`}
                rel="noreferrer"
                target="_blank"
              >
                {doc.title}
              </a>
              <span className="shrink-0 text-muted text-xs">
                {humanize(doc.source_status)}
              </span>
            </li>
          ))}
          {docs.length === 0 ? (
            <li className="text-muted">No documents.</li>
          ) : null}
        </ul>
      </Card>
    </section>
  );
}

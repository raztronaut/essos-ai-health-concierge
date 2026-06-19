import type { CareInstruction } from "@essos/shared";
import { PolicyBadge } from "@/components/badges";
import { humanize } from "@/lib/format";

/** A single care-instruction entry with its answer policy. */
export function CareRow({ doc }: { doc: CareInstruction }) {
  return (
    <li className="border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{doc.title}</span>
        <PolicyBadge policy={doc.answer_policy} />
      </div>
      <p className="mt-1 text-sm text-ink/80">{doc.body}</p>
      <div className="mt-1 text-[11px] text-muted">{humanize(doc.source_status)}</div>
    </li>
  );
}

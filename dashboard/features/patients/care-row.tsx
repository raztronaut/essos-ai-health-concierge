import type { CareInstruction } from "@essos/shared";
import { PolicyBadge } from "@/components/badges";
import { Button } from "@/components/ui";
import { humanize } from "@/lib/format";

/** A single care-instruction entry with its answer policy and edit controls. */
export function CareRow({
  doc,
  onEdit,
  onDelete,
}: {
  doc: CareInstruction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group border-border border-t pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{doc.title}</span>
          <PolicyBadge policy={doc.answer_policy} />
        </div>
        <div className="flex shrink-0 gap-1">
          <Button onClick={onEdit} size="sm" variant="ghost">
            Edit
          </Button>
          <Button onClick={onDelete} size="sm" variant="ghost">
            Remove
          </Button>
        </div>
      </div>
      <p className="mt-1 text-ink/80 text-sm">{doc.body}</p>
      <div className="mt-1 text-[11px] text-muted">
        {humanize(doc.source_status)}
      </div>
    </li>
  );
}

"use client";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Button, Card, Select } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";

/**
 * Patient ownership widget. Leads (`org:admin`) can (re)assign to any synced
 * concierge; members can self-claim an unassigned patient. The active role/id
 * comes from the demo identity (the "view as" switcher in demo mode, otherwise
 * the real signed-in concierge).
 */
export function AssignControl({
  patientId,
  assigneeUserId,
  minimal = false,
}: {
  patientId: string;
  assigneeUserId: string | null;
  minimal?: boolean;
}) {
  const { isLead, effectiveId, viewAs, concierges } = useDemoIdentity();
  const assign = useMutation(api.mutations.assignPatient);

  const ownerName =
    concierges.find((c) => c.clerkId === assigneeUserId)?.name ??
    (assigneeUserId ? "Assigned" : "Unassigned");

  const canClaim = !isLead && assigneeUserId === null && effectiveId !== null;

  function runAssign(nextAssignee: string | null) {
    const nextName = nextAssignee
      ? (concierges.find((c) => c.clerkId === nextAssignee)?.name ??
        "concierge")
      : null;
    toast.promise(assign({ patientId, assigneeUserId: nextAssignee, viewAs }), {
      loading: "Updating owner…",
      success: nextName ? `Assigned to ${nextName}` : "Patient unassigned",
      error: (error) =>
        error instanceof Error ? error.message : "Couldn’t update owner",
    });
  }

  const content = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        {!minimal && <div className="text-muted text-xs">Owner</div>}
        <div className="truncate font-medium text-ink text-sm">{ownerName}</div>
      </div>

      {isLead && concierges.length > 0 ? (
        <div className={minimal ? "w-32" : "w-40"}>
          <Select
            aria-label="Assign patient to owner"
            onChange={(e) => runAssign(e.target.value || null)}
            value={assigneeUserId ?? ""}
          >
            <option value="">Unassigned</option>
            {concierges.map((c) => (
              <option key={c.clerkId} value={c.clerkId}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      ) : canClaim ? (
        <Button
          onClick={() => runAssign(effectiveId)}
          size="sm"
          variant="primary"
        >
          Claim
        </Button>
      ) : null}
    </div>
  );

  if (minimal) {
    return content;
  }

  return <Card>{content}</Card>;
}

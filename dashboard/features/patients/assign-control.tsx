"use client";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { Card } from "@/components/ui";
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
}: {
  patientId: string;
  assigneeUserId: string | null;
}) {
  const { isLead, effectiveId, viewAs, concierges } = useDemoIdentity();
  const assign = useMutation(api.mutations.assignPatient);

  const ownerName =
    concierges.find((c) => c.clerkId === assigneeUserId)?.name ??
    (assigneeUserId ? "Assigned" : "Unassigned");

  const canClaim = !isLead && assigneeUserId === null && effectiveId !== null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-muted text-xs">Owner</div>
          <div className="truncate font-medium text-ink text-sm">
            {ownerName}
          </div>
        </div>

        {isLead && concierges.length > 0 ? (
          <select
            className="focus-ring rounded-control border border-border bg-surface px-2 py-1.5 text-ink text-sm"
            onChange={(e) =>
              assign({
                patientId,
                assigneeUserId: e.target.value || null,
                viewAs,
              })
            }
            value={assigneeUserId ?? ""}
          >
            <option value="">Unassigned</option>
            {concierges.map((c) => (
              <option key={c.clerkId} value={c.clerkId}>
                {c.name}
              </option>
            ))}
          </select>
        ) : canClaim ? (
          <button
            className="focus-ring rounded-control bg-primary px-3 py-1.5 font-medium text-sm text-white"
            onClick={() =>
              assign({ patientId, assigneeUserId: effectiveId, viewAs })
            }
            type="button"
          >
            Claim
          </button>
        ) : null}
      </div>
    </Card>
  );
}

"use client";

import { api } from "@convex/_generated/api";
import type { CareInstruction, CarePhase, Procedure } from "@essos/shared";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button, Card, ConfirmDialog } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { humanize } from "@/lib/format";
import { CareInstructionDialog } from "./care-instruction-dialog";
import { CareRow } from "./care-row";

const PHASES: CarePhase[] = ["preop", "postop", "general"];

export function CareInstructions({
  patientId,
  patientProcedure,
  care,
}: {
  patientId: string;
  patientProcedure: Procedure;
  care: CareInstruction[];
}) {
  const { viewAs } = useDemoIdentity();
  const remove = useMutation(api.mutations.deleteCareInstruction);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CareInstruction | null>(null);
  const [deleting, setDeleting] = useState<CareInstruction | null>(null);

  const activePhases = PHASES.filter((phase) =>
    care.some((c) => c.phase === phase)
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Care instructions</h2>
        <Button onClick={() => setAdding(true)} variant="ghost">
          Add instruction
        </Button>
      </div>

      {care.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">No care instructions on file.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {activePhases.map((phase) => {
            const docs = care.filter((c) => c.phase === phase);
            return (
              <Card className="flex flex-col gap-3" key={phase}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{humanize(phase)}</h3>
                  <span className="text-muted text-xs">
                    {docs.length} {docs.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <ul className="space-y-3">
                  {docs.map((doc) => (
                    <CareRow
                      doc={doc}
                      key={doc.id}
                      onDelete={() => setDeleting(doc)}
                      onEdit={() => setEditing(doc)}
                    />
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {adding ? (
        <CareInstructionDialog
          onClose={() => setAdding(false)}
          open={true}
          patientId={patientId}
          patientProcedure={patientProcedure}
        />
      ) : null}
      {editing ? (
        <CareInstructionDialog
          care={editing}
          onClose={() => setEditing(null)}
          open={true}
          patientId={patientId}
          patientProcedure={patientProcedure}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          description={`Remove "${deleting.title}"?`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await remove({ id: deleting.id, viewAs });
          }}
          open={true}
          title="Remove care instruction"
        />
      ) : null}
    </section>
  );
}

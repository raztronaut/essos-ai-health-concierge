"use client";

import { api } from "@convex/_generated/api";
import type { CareInstruction, CarePhase, Procedure } from "@essos/shared";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button, Card, ConfirmDialog, Dialog } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { cn } from "@/lib/cn";
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
  const [selectedPhase, setSelectedPhase] = useState<CarePhase>(() => {
    const firstActive = PHASES.find((phase) =>
      care.some((c) => c.phase === phase)
    );
    return firstActive || "preop";
  });
  const [viewingAll, setViewingAll] = useState(false);

  const docs = care.filter((c) => c.phase === selectedPhase);
  const visibleDocs = docs.slice(0, 5);
  const hasMore = docs.length > 5;

  return (
    <section className="space-y-4">
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
        <div className="flex flex-col gap-4">
          {/* Phase Toggle Tabs */}
          <div className="flex border-border border-b">
            {PHASES.map((phase) => {
              const count = care.filter((c) => c.phase === phase).length;
              const isActive = selectedPhase === phase;
              return (
                <button
                  className={cn(
                    "focus-ring relative border-b-2 px-4 py-2.5 font-semibold text-sm transition-all duration-fast active:scale-[0.97]",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-ink"
                  )}
                  key={phase}
                  onClick={() => setSelectedPhase(phase)}
                  type="button"
                >
                  {humanize(phase)}
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 font-medium text-xs transition-colors duration-fast",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-surface text-muted"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Phase Instructions Card */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {humanize(selectedPhase)}
              </h3>
              <span className="text-muted text-xs">
                {docs.length} {docs.length === 1 ? "item" : "items"}
              </span>
            </div>

            {docs.length === 0 ? (
              <p className="py-8 text-center text-muted text-sm">
                No {humanize(selectedPhase).toLowerCase()} instructions on file.
              </p>
            ) : (
              <>
                <ul className="space-y-3">
                  {visibleDocs.map((doc) => (
                    <CareRow
                      doc={doc}
                      key={doc.id}
                      onDelete={() => setDeleting(doc)}
                      onEdit={() => setEditing(doc)}
                    />
                  ))}
                </ul>

                {hasMore ? (
                  <div className="mt-4 flex justify-center border-border/40 border-t pt-3.5">
                    <Button
                      className="flex items-center gap-1.5 rounded-control px-3 py-1.5 font-semibold text-muted text-xs hover:text-ink"
                      onClick={() => setViewingAll(true)}
                      size="sm"
                      variant="ghost"
                    >
                      <span>Show all {docs.length} instructions</span>
                      <svg
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-muted/80"
                        fill="none"
                        role="presentation"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </div>
      )}

      {viewingAll ? (
        <Dialog
          onClose={() => setViewingAll(false)}
          open={true}
          title={`${humanize(selectedPhase)} Care Instructions`}
        >
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <ul className="space-y-3">
              {docs.map((doc) => (
                <CareRow
                  doc={doc}
                  key={doc.id}
                  onDelete={() => {
                    setDeleting(doc);
                    setViewingAll(false);
                  }}
                  onEdit={() => {
                    setEditing(doc);
                    setViewingAll(false);
                  }}
                />
              ))}
            </ul>
          </div>
        </Dialog>
      ) : null}

      {adding ? (
        <CareInstructionDialog
          defaultPhase={selectedPhase}
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

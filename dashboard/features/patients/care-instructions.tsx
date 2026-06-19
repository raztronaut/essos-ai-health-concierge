import type { CareInstruction, CarePhase } from "@essos/shared";
import { Card } from "@/components/ui";
import { humanize } from "@/lib/format";
import { CareRow } from "./care-row";

const PHASES: CarePhase[] = ["preop", "postop", "general"];

export function CareInstructions({ care }: { care: CareInstruction[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Care instructions</h2>
      {PHASES.map((phase) => {
        const docs = care.filter((c) => c.phase === phase);
        if (docs.length === 0) return null;
        return (
          <Card key={phase}>
            <h3 className="text-sm font-semibold">{humanize(phase)}</h3>
            <ul className="mt-2 space-y-3">
              {docs.map((doc) => (
                <CareRow key={doc.id} doc={doc} />
              ))}
            </ul>
          </Card>
        );
      })}
    </section>
  );
}

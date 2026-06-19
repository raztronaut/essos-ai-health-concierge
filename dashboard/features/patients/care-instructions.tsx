import type { CareInstruction, CarePhase } from "@essos/shared";
import { Card } from "@/components/ui";
import { humanize } from "@/lib/format";
import { CareRow } from "./care-row";

const PHASES: CarePhase[] = ["preop", "postop", "general"];

export function CareInstructions({ care }: { care: CareInstruction[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-lg">Care instructions</h2>
      {PHASES.map((phase) => {
        const docs = care.filter((c) => c.phase === phase);
        if (docs.length === 0) {
          return null;
        }
        return (
          <Card key={phase}>
            <h3 className="font-semibold text-sm">{humanize(phase)}</h3>
            <ul className="mt-2 space-y-3">
              {docs.map((doc) => (
                <CareRow doc={doc} key={doc.id} />
              ))}
            </ul>
          </Card>
        );
      })}
    </section>
  );
}

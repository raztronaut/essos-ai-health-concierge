"use client";

import {
  ALL_CATEGORIES,
  CATEGORY_POLICIES,
  type EscalationCategory,
  type EscalationLevel,
  type PatientPolicyOverride,
  resolvePatientPolicy,
} from "@essos/shared";

/**
 * Per-patient escalation policy editor (ADR 021). Tighten-only by design: a
 * normally-autonomous category can be forced to escalate, and a Med flag can be
 * raised to High, but a clinical guardrail can never be loosened — those rows
 * render locked. The effective behavior (global default + this patient's
 * overrides) is shown on every row via `resolvePatientPolicy`.
 */
export function PolicyControl({
  value,
  onChange,
}: {
  value: PatientPolicyOverride[];
  onChange: (next: PatientPolicyOverride[]) => void;
}) {
  const find = (category: EscalationCategory) =>
    value.find((o) => o.category === category);

  const setOverride = (
    category: EscalationCategory,
    patch: Partial<PatientPolicyOverride> | null
  ) => {
    const rest = value.filter((o) => o.category !== category);
    if (patch === null) {
      onChange(rest);
      return;
    }
    onChange([...rest, { category, ...find(category), ...patch }]);
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-control border border-border bg-surface/20 p-3">
      {ALL_CATEGORIES.map((category) => (
        <PolicyRow
          category={category}
          key={category}
          onChange={(patch) => setOverride(category, patch)}
          override={find(category)}
        />
      ))}
    </div>
  );
}

function PolicyRow({
  category,
  override,
  onChange,
}: {
  category: EscalationCategory;
  override?: PatientPolicyOverride;
  onChange: (patch: Partial<PatientPolicyOverride> | null) => void;
}) {
  const base = CATEGORY_POLICIES[category];
  const effective = resolvePatientPolicy(category, override ? [override] : []);
  const effectiveLabel = effective.autonomous
    ? "Eve answers"
    : `Escalates · ${effective.defaultLevel ?? "Med"}`;

  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="min-w-0">
        <div className="font-medium text-ink text-xs">{base.label}</div>
        <div className="truncate text-[11px] text-ink-muted">
          {effectiveLabel}
        </div>
      </div>
      <div className="shrink-0">
        {base.autonomous ? (
          <AutonomousControls
            forced={override?.force_escalate === true}
            level={override?.level ?? "Med"}
            onChange={onChange}
          />
        ) : (
          <EscalatingControls
            base={base.defaultLevel ?? "Med"}
            level={override?.level}
            onChange={onChange}
          />
        )}
      </div>
    </div>
  );
}

/** An autonomous category: optionally force it to escalate, then pick a level. */
function AutonomousControls({
  forced,
  level,
  onChange,
}: {
  forced: boolean;
  level: EscalationLevel;
  onChange: (patch: Partial<PatientPolicyOverride> | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex cursor-pointer select-none items-center gap-1.5 font-medium text-[11px] text-ink">
        <input
          checked={forced}
          className="size-3.5 rounded border-border text-primary focus:ring-primary"
          onChange={(e) =>
            onChange(e.target.checked ? { force_escalate: true } : null)
          }
          type="checkbox"
        />
        <span>Always escalate</span>
      </label>
      {forced ? (
        <select
          className="rounded border border-border bg-surface px-1 py-0.5 text-[11px] text-ink"
          onChange={(e) =>
            onChange({ level: e.target.value as EscalationLevel })
          }
          value={level}
        >
          <option value="Med">Med</option>
          <option value="High">High</option>
        </select>
      ) : null}
    </div>
  );
}

/**
 * A category that already escalates. A Med default can be raised to High; a
 * High default is locked (you cannot loosen a clinical guardrail).
 */
function EscalatingControls({
  base,
  level,
  onChange,
}: {
  base: EscalationLevel;
  level?: EscalationLevel;
  onChange: (patch: Partial<PatientPolicyOverride> | null) => void;
}) {
  if (base === "High") {
    return <span className="text-[11px] text-ink-muted">Locked</span>;
  }
  const raised = level === "High";
  return (
    <label className="flex cursor-pointer select-none items-center gap-1.5 font-medium text-[11px] text-ink">
      <input
        checked={raised}
        className="size-3.5 rounded border-border text-primary focus:ring-primary"
        onChange={(e) => onChange(e.target.checked ? { level: "High" } : null)}
        type="checkbox"
      />
      <span>Raise to High</span>
    </label>
  );
}

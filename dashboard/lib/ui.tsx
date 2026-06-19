import type { ReactNode } from "react";
import type {
  AutomationState,
  CareAnswerPolicy,
  CareInstruction,
  EscalationLevel,
  EscalationStatus,
  MessageRole,
} from "@essos/shared";
import { humanize } from "./format";

// ---------------------------------------------------------------------------
// Shared vocabulary
// ---------------------------------------------------------------------------

/** One label map for message roles, shared by the thread view and the list. */
export const ROLE_LABEL: Record<MessageRole, string> = {
  patient: "Patient",
  agent: "Eve",
  concierge: "Concierge",
  system: "System",
};

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export function LevelBadge({ level }: { level: EscalationLevel }) {
  const cls = level === "High" ? "bg-high-soft text-high" : "bg-med-soft text-med";
  return <Pill className={cls}>{level}</Pill>;
}

export function StatusBadge({ status }: { status: EscalationStatus }) {
  const map: Record<EscalationStatus, string> = {
    open: "bg-high-soft text-high",
    taken_over: "bg-med-soft text-med",
    resolved: "bg-ok-soft text-ok",
  };
  return <Pill className={map[status]}>{humanize(status)}</Pill>;
}

export function AutomationBadge({ state }: { state: AutomationState }) {
  const map: Record<AutomationState, string> = {
    active: "bg-ok-soft text-ok",
    paused_for_review: "bg-med-soft text-med",
    taken_over: "bg-high-soft text-high",
    resolved: "bg-secondary/40 text-ink",
  };
  const labels: Record<AutomationState, string> = {
    active: "Eve active",
    paused_for_review: "Paused for review",
    taken_over: "Human handling",
    resolved: "Resolved",
  };
  return <Pill className={map[state]}>{labels[state]}</Pill>;
}

export function PolicyBadge({ policy }: { policy: CareAnswerPolicy }) {
  const cls = policy === "answer_reference" ? "bg-ok-soft text-ok" : "bg-high-soft text-high";
  const label = policy === "answer_reference" ? "Answerable" : "Escalate only";
  return <Pill className={cls}>{label}</Pill>;
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-secondary/60 bg-card p-5 ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1">{eyebrow}</div> : null}
        <h1 className="serif text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <div className="text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-sm font-medium text-ink/80">{label}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
    </Card>
  );
}

/** A label/value pair for the definition-list panels. */
export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

/** A single care-instruction entry with its answer policy. */
export function CareRow({ doc }: { doc: CareInstruction }) {
  return (
    <li className="border-t border-secondary/40 pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{doc.title}</span>
        <PolicyBadge policy={doc.answer_policy} />
      </div>
      <p className="mt-1 text-sm text-ink/80">{doc.body}</p>
      <div className="mt-1 text-[11px] text-muted">{humanize(doc.source_status)}</div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "ghost" | "ok";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:opacity-90",
  ghost: "border border-secondary/70 text-ink hover:bg-surface",
  ok: "bg-ok text-white hover:opacity-90",
};

export function Button({
  variant = "ghost",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}

import type {
  AutomationState,
  CareAnswerPolicy,
  EscalationLevel,
  EscalationStatus,
} from "@essos/shared";
import { humanize } from "./format";

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export function LevelBadge({ level }: { level: EscalationLevel }) {
  const cls =
    level === "High"
      ? "bg-high-soft text-high"
      : "bg-med-soft text-med";
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
  const cls =
    policy === "answer_reference"
      ? "bg-ok-soft text-ok"
      : "bg-high-soft text-high";
  const label = policy === "answer_reference" ? "Answerable" : "Escalate only";
  return <Pill className={cls}>{label}</Pill>;
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-secondary/60 bg-card p-5 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

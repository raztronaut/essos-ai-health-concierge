"use client";

import { api } from "@convex/_generated/api";
import type {
  CareAnswerPolicy,
  CareInstruction,
  CarePhase,
  CareSourceStatus,
  CareSourceType,
  Procedure,
} from "@essos/shared";
import { useMutation } from "convex/react";
import { useState } from "react";
import {
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
  DialogForm,
  useDialogForm,
} from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import {
  ANSWER_POLICY_OPTIONS,
  CARE_PHASE_OPTIONS,
  CARE_SOURCE_STATUS_OPTIONS,
  CARE_SOURCE_TYPE_OPTIONS,
  PROCEDURE_OPTIONS,
} from "./options";

interface CareFormState {
  phase: CarePhase;
  procedure: Procedure;
  title: string;
  body: string;
  sourceType: CareSourceType;
  sourceStatus: CareSourceStatus;
  answerPolicy: CareAnswerPolicy;
}

export function CareInstructionDialog({
  open,
  onClose,
  patientId,
  patientProcedure,
  care,
}: {
  open: boolean;
  onClose: () => void;
  patientId: string;
  patientProcedure: Procedure;
  care?: CareInstruction | null;
}) {
  const { viewAs } = useDemoIdentity();
  const upsert = useMutation(api.mutations.upsertCareInstruction);

  const [form, setForm] = useState<CareFormState>({
    phase: care?.phase ?? "preop",
    procedure: care?.procedure ?? patientProcedure,
    title: care?.title ?? "",
    body: care?.body ?? "",
    sourceType: care?.source_type ?? "essos_summary",
    sourceStatus: care?.source_status ?? "demo_notional",
    answerPolicy: care?.answer_policy ?? "answer_reference",
  });

  const set = <K extends keyof CareFormState>(key: K, value: CareFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const { pending, error, handleSubmit } = useDialogForm(
    async (formData: CareFormState) => {
      if (!(formData.title.trim() && formData.body.trim())) {
        throw new Error("Title and body are required.");
      }
      return await upsert({
        id: care?.id,
        patientId,
        phase: formData.phase,
        procedure: formData.procedure,
        title: formData.title.trim(),
        body: formData.body.trim(),
        source_type: formData.sourceType,
        source_status: formData.sourceStatus,
        answer_policy: formData.answerPolicy,
        viewAs,
      });
    },
    () => onClose()
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(form).catch(() => {});
  };

  return (
    <Dialog
      onClose={onClose}
      open={open}
      title={care ? "Edit care instruction" : "Add care instruction"}
    >
      <DialogForm
        error={error}
        onClose={onClose}
        onSubmit={onSubmit}
        pending={pending}
        submitLabel="Save"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phase">
            <Select
              onChange={(e) => set("phase", e.target.value as CarePhase)}
              value={form.phase}
            >
              {CARE_PHASE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Procedure">
            <Select
              onChange={(e) => set("procedure", e.target.value as Procedure)}
              value={form.procedure}
            >
              {PROCEDURE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Title">
              <Input
                onChange={(e) => set("title", e.target.value)}
                value={form.title}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Body">
              <Textarea
                onChange={(e) => set("body", e.target.value)}
                rows={5}
                value={form.body}
              />
            </Field>
          </div>
          <Field label="Source type">
            <Select
              onChange={(e) => set("sourceType", e.target.value as CareSourceType)}
              value={form.sourceType}
            >
              {CARE_SOURCE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Source status">
            <Select
              onChange={(e) => set("sourceStatus", e.target.value as CareSourceStatus)}
              value={form.sourceStatus}
            >
              {CARE_SOURCE_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field
              hint="Controls whether Eve may quote this or must escalate."
              label="Answer policy"
            >
              <Select
                onChange={(e) => set("answerPolicy", e.target.value as CareAnswerPolicy)}
                value={form.answerPolicy}
              >
                {ANSWER_POLICY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </DialogForm>
    </Dialog>
  );
}

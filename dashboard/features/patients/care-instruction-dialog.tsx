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
  Button,
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import {
  ANSWER_POLICY_OPTIONS,
  CARE_PHASE_OPTIONS,
  CARE_SOURCE_STATUS_OPTIONS,
  CARE_SOURCE_TYPE_OPTIONS,
  PROCEDURE_OPTIONS,
} from "./options";

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
  const [phase, setPhase] = useState<CarePhase>(care?.phase ?? "preop");
  const [procedure, setProcedure] = useState<Procedure>(
    care?.procedure ?? patientProcedure
  );
  const [title, setTitle] = useState(care?.title ?? "");
  const [body, setBody] = useState(care?.body ?? "");
  const [sourceType, setSourceType] = useState<CareSourceType>(
    care?.source_type ?? "essos_summary"
  );
  const [sourceStatus, setSourceStatus] = useState<CareSourceStatus>(
    care?.source_status ?? "demo_notional"
  );
  const [answerPolicy, setAnswerPolicy] = useState<CareAnswerPolicy>(
    care?.answer_policy ?? "answer_reference"
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!(title.trim() && body.trim())) {
      setError("Title and body are required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await upsert({
        id: care?.id,
        patientId,
        phase,
        procedure,
        title: title.trim(),
        body: body.trim(),
        source_type: sourceType,
        source_status: sourceStatus,
        answer_policy: answerPolicy,
        viewAs,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save instruction."
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      footer={
        <>
          <Button disabled={pending} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button disabled={pending} onClick={handleSubmit} variant="primary">
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title={care ? "Edit care instruction" : "Add care instruction"}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phase">
          <Select
            onChange={(e) => setPhase(e.target.value as CarePhase)}
            value={phase}
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
            onChange={(e) => setProcedure(e.target.value as Procedure)}
            value={procedure}
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
            <Input onChange={(e) => setTitle(e.target.value)} value={title} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Body">
            <Textarea
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              value={body}
            />
          </Field>
        </div>
        <Field label="Source type">
          <Select
            onChange={(e) => setSourceType(e.target.value as CareSourceType)}
            value={sourceType}
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
            onChange={(e) =>
              setSourceStatus(e.target.value as CareSourceStatus)
            }
            value={sourceStatus}
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
              onChange={(e) =>
                setAnswerPolicy(e.target.value as CareAnswerPolicy)
              }
              value={answerPolicy}
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
      {error ? <p className="mt-3 text-high text-sm">{error}</p> : null}
    </Dialog>
  );
}

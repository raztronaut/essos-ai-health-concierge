"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type {
  CareAnswerPolicy,
  CareSourceStatus,
  CareSourceType,
  SourceDocumentKind,
} from "@essos/shared";
import { useMutation } from "convex/react";
import { useState } from "react";
import {
  Dialog,
  DialogForm,
  Field,
  Input,
  Select,
  useDialogForm,
} from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import {
  ANSWER_POLICY_OPTIONS,
  CARE_SOURCE_STATUS_OPTIONS,
  CARE_SOURCE_TYPE_OPTIONS,
  SOURCE_DOCUMENT_KIND_OPTIONS,
} from "./options";

interface UploadFormState {
  answerPolicy: CareAnswerPolicy;
  file: File | null;
  kind: SourceDocumentKind;
  sourceStatus: CareSourceStatus;
  sourceType: CareSourceType;
  title: string;
}

/** Upload a file to Convex storage and record it as a patient source document. */
export function DocumentUploadDialog({
  open,
  onClose,
  patientId,
}: {
  open: boolean;
  onClose: () => void;
  patientId: string;
}) {
  const { viewAs } = useDemoIdentity();
  const generateUploadUrl = useMutation(api.mutations.generateUploadUrl);
  const createDoc = useMutation(api.mutations.createSourceDocument);

  const [form, setForm] = useState<UploadFormState>({
    file: null,
    title: "",
    kind: "care_packet",
    sourceType: "clinic_packet",
    sourceStatus: "verified",
    answerPolicy: "answer_reference",
  });

  const set = <K extends keyof UploadFormState>(
    key: K,
    value: UploadFormState[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const { pending, error, handleSubmit } = useDialogForm(
    async (formData: UploadFormState) => {
      if (!formData.file) {
        throw new Error("Choose a file to upload.");
      }
      const docTitle = formData.title.trim() || formData.file.name;
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": formData.file.type || "application/octet-stream",
        },
        body: formData.file,
      });
      if (!res.ok) {
        throw new Error("Upload failed.");
      }
      const { storageId } = (await res.json()) as {
        storageId: Id<"_storage">;
      };
      await createDoc({
        patientId,
        kind: formData.kind,
        title: docTitle,
        source_type: formData.sourceType,
        source_status: formData.sourceStatus,
        answer_policy: formData.answerPolicy,
        storageId,
        fileName: formData.file.name,
        contentType: formData.file.type || null,
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
      description="Upload a PDF or document. Eve can be allowed to reference it."
      onClose={onClose}
      open={open}
      title="Upload document"
    >
      <DialogForm
        error={error}
        onClose={onClose}
        onSubmit={onSubmit}
        pending={pending}
        pendingLabel="Uploading…"
        submitLabel="Upload"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="File">
              <Input
                onChange={(e) => set("file", e.target.files?.[0] ?? null)}
                type="file"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field hint="Defaults to the file name." label="Title">
              <Input
                onChange={(e) => set("title", e.target.value)}
                placeholder="Pre-op care packet"
                value={form.title}
              />
            </Field>
          </div>
          <Field label="Kind">
            <Select
              onChange={(e) =>
                set("kind", e.target.value as SourceDocumentKind)
              }
              value={form.kind}
            >
              {SOURCE_DOCUMENT_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Source type">
            <Select
              onChange={(e) =>
                set("sourceType", e.target.value as CareSourceType)
              }
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
              onChange={(e) =>
                set("sourceStatus", e.target.value as CareSourceStatus)
              }
              value={form.sourceStatus}
            >
              {CARE_SOURCE_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            hint="Whether Eve may quote this document."
            label="Answer policy"
          >
            <Select
              onChange={(e) =>
                set("answerPolicy", e.target.value as CareAnswerPolicy)
              }
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
      </DialogForm>
    </Dialog>
  );
}

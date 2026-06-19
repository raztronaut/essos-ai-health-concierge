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
import { Button, Dialog, Field, Input, Select } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import {
  ANSWER_POLICY_OPTIONS,
  CARE_SOURCE_STATUS_OPTIONS,
  CARE_SOURCE_TYPE_OPTIONS,
  SOURCE_DOCUMENT_KIND_OPTIONS,
} from "./options";

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

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<SourceDocumentKind>("care_packet");
  const [sourceType, setSourceType] = useState<CareSourceType>("clinic_packet");
  const [sourceStatus, setSourceStatus] =
    useState<CareSourceStatus>("verified");
  const [answerPolicy, setAnswerPolicy] =
    useState<CareAnswerPolicy>("answer_reference");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    const docTitle = title.trim() || file.name;
    setPending(true);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) {
        throw new Error("Upload failed.");
      }
      const { storageId } = (await res.json()) as {
        storageId: Id<"_storage">;
      };
      await createDoc({
        patientId,
        kind,
        title: docTitle,
        source_type: sourceType,
        source_status: sourceStatus,
        answer_policy: answerPolicy,
        storageId,
        fileName: file.name,
        contentType: file.type || null,
        viewAs,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      description="Upload a PDF or document. Eve can be allowed to reference it."
      footer={
        <>
          <Button disabled={pending} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button disabled={pending} onClick={handleSubmit} variant="primary">
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title="Upload document"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="File">
            <Input
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              type="file"
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field hint="Defaults to the file name." label="Title">
            <Input
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pre-op care packet"
              value={title}
            />
          </Field>
        </div>
        <Field label="Kind">
          <Select
            onChange={(e) => setKind(e.target.value as SourceDocumentKind)}
            value={kind}
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
        <Field
          hint="Whether Eve may quote this document."
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
      {error ? <p className="mt-3 text-high text-sm">{error}</p> : null}
    </Dialog>
  );
}

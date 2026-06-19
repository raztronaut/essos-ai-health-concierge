"use client";

import { api } from "@convex/_generated/api";
import type { SourceDocument } from "@essos/shared";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button, Card, ConfirmDialog } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { humanize } from "@/lib/format";
import { DocumentUploadDialog } from "./document-upload-dialog";

export function SourceDocuments({
  patientId,
  docs,
}: {
  patientId: string;
  docs: SourceDocument[];
}) {
  const { viewAs } = useDemoIdentity();
  const remove = useMutation(api.mutations.deleteSourceDocument);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<SourceDocument | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Source documents</h2>
        <Button onClick={() => setUploading(true)} variant="ghost">
          Upload
        </Button>
      </div>
      <Card>
        <ul className="space-y-2 text-sm">
          {docs.map((doc) => (
            <li
              className="flex items-center justify-between gap-2"
              key={doc.id}
            >
              <a
                className="min-w-0 truncate font-medium text-primary hover:underline"
                href={`/source-docs/${doc.id}`}
                rel="noreferrer"
                target="_blank"
              >
                {doc.title}
              </a>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-muted text-xs">
                  {humanize(doc.source_status)}
                </span>
                {doc.patient_id ? (
                  <Button
                    onClick={() => setDeleting(doc)}
                    size="sm"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
          {docs.length === 0 ? (
            <li className="text-muted">No documents.</li>
          ) : null}
        </ul>
      </Card>

      {uploading ? (
        <DocumentUploadDialog
          onClose={() => setUploading(false)}
          open={true}
          patientId={patientId}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          description={`Remove "${deleting.title}"? This deletes the uploaded file.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await remove({ id: deleting.id, viewAs });
          }}
          open={true}
          title="Remove document"
        />
      ) : null}
    </section>
  );
}

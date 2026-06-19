"use client";

import { api } from "@convex/_generated/api";
import type { SourceDocument } from "@essos/shared";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, ConfirmDialog, TextLink } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { humanize } from "@/lib/format";
import { DocumentUploadDialog } from "./document-upload-dialog";

export function SourceDocuments({
  patientId,
  docs,
  minimal = false,
}: {
  patientId: string;
  docs: SourceDocument[];
  minimal?: boolean;
}) {
  const { viewAs } = useDemoIdentity();
  const remove = useMutation(api.mutations.deleteSourceDocument);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<SourceDocument | null>(null);

  const listContent = (
    <ul className="space-y-2 text-xs">
      {docs.map((doc) => (
        <li
          className="group -mx-1.5 flex items-center justify-between gap-3 rounded-control px-1.5 py-1 transition-colors duration-fast hover:bg-surface/50"
          key={doc.id}
        >
          <div className="min-w-0 flex-1">
            <TextLink
              className="block truncate font-medium text-xs"
              href={`/source-docs/${doc.id}`}
              rel="noreferrer"
              target="_blank"
            >
              {doc.title}
            </TextLink>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-right text-[10px] text-meta transition-all duration-200">
              {humanize(doc.source_status)}
            </span>
            <div className="pointer-events-none flex max-w-0 items-center gap-1 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-out group-hover:pointer-events-auto group-hover:max-w-[120px] group-hover:opacity-100">
              <Link
                className="focus-ring inline-flex items-center justify-center rounded-control border border-border bg-card px-1.5 py-0.5 font-semibold text-[10px] text-ink transition-colors hover:border-secondary/70 hover:bg-surface"
                href={`/source-docs/${doc.id}`}
                rel="noreferrer"
                target="_blank"
              >
                Open
              </Link>
              {doc.patient_id ? (
                <Button
                  className="px-1.5 py-0.5 text-[10px]"
                  onClick={() => setDeleting(doc)}
                  size="sm"
                  variant="ghost"
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </li>
      ))}
      {docs.length === 0 ? (
        <li className="text-muted text-xs italic">No documents.</li>
      ) : null}
    </ul>
  );

  if (minimal) {
    return (
      <div className="flex h-full flex-col gap-2.5">
        <div className="flex items-center justify-between border-border/40 border-b pb-2">
          <h3 className="font-semibold text-ink text-meta text-xs uppercase tracking-wider">
            Source Documents
          </h3>
          <Button
            className="px-2 py-0.5 text-[10px]"
            onClick={() => setUploading(true)}
            size="sm"
            variant="ghost"
          >
            Upload
          </Button>
        </div>
        <div className="max-h-[130px] flex-1 overflow-y-auto pr-1">
          {listContent}
        </div>

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
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Source documents</h2>
        <Button onClick={() => setUploading(true)} variant="ghost">
          Upload
        </Button>
      </div>
      <Card>
        <ul className="space-y-2.5 text-sm">
          {docs.map((doc) => (
            <li
              className="group -mx-2 flex items-center justify-between gap-3 rounded-control px-2 py-1.5 transition-colors duration-fast hover:bg-surface/50"
              key={doc.id}
            >
              <div className="min-w-0 flex-1">
                <TextLink
                  className="block truncate font-medium"
                  href={`/source-docs/${doc.id}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {doc.title}
                </TextLink>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-right text-meta transition-all duration-200">
                  {humanize(doc.source_status)}
                </span>
                <div className="pointer-events-none flex max-w-0 items-center gap-1 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-out group-hover:pointer-events-auto group-hover:max-w-[140px] group-hover:opacity-100">
                  <Link
                    className="focus-ring inline-flex items-center justify-center rounded-control border border-border bg-card px-2 py-1 font-semibold text-ink text-xs transition-colors hover:border-secondary/70 hover:bg-surface"
                    href={`/source-docs/${doc.id}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open
                  </Link>
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
              </div>
            </li>
          ))}
          {docs.length === 0 ? (
            <li className="text-muted text-sm">No documents.</li>
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

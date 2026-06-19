import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export const dynamic = "force-dynamic";

// app/source-docs/[id] -> repo root is four levels up.
const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  ".."
);

/**
 * Resolve a stored relative doc path against the repo root, rejecting anything
 * that escapes it. The paths are seed-only today, but this keeps the disk read
 * from being a traversal vector if that ever changes.
 */
function resolveWithinRepo(relativePath: string): string | null {
  const target = resolve(REPO_ROOT, relativePath);
  if (target !== REPO_ROOT && !target.startsWith(`${REPO_ROOT}/`)) {
    return null;
  }
  return target;
}

/**
 * Serve a seeded source document. Looks the document up in Convex, then reads
 * the polished PDF from `mock-assets/pdf/essos/` inline; falls back to the
 * Markdown source, then a 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const convexUrl =
    process.env.NEXT_PUBLIC_CONVEX_URL ?? "http://127.0.0.1:3210";
  const client = new ConvexHttpClient(convexUrl);
  const doc = await client.query(api.queries.getSourceDocument, { id });
  if (!doc) {
    return new Response("Document not found", { status: 404 });
  }

  // Uploaded docs live in Convex file storage — redirect to a signed URL.
  if (doc.storage_id) {
    const url = await client.query(api.queries.getSourceDocumentUrl, { id });
    if (url) {
      return Response.redirect(url, 302);
    }
    return new Response("Document source is unavailable", { status: 404 });
  }

  const pdfPath = doc.pdf_path ? resolveWithinRepo(doc.pdf_path) : null;
  if (pdfPath) {
    try {
      const buffer = await readFile(pdfPath);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="${doc.id}.pdf"`,
        },
      });
    } catch {
      // PDF missing — fall back to the Markdown source.
    }
  }

  const markdownPath = doc.markdown_path
    ? resolveWithinRepo(doc.markdown_path)
    : null;
  if (markdownPath) {
    try {
      const markdown = await readFile(markdownPath, "utf8");
      return new Response(markdown, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    } catch {
      // Fall through to the unavailable response.
    }
  }

  return new Response("Document source is unavailable", { status: 404 });
}

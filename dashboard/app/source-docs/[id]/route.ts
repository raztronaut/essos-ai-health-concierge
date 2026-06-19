import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { REPO_ROOT, listSourceDocuments } from "@essos/shared";

export const dynamic = "force-dynamic";

/**
 * Serve a seeded source document. Reads the polished PDF from
 * `mock-assets/pdf/essos/` when present and returns it inline; if the PDF is
 * missing it falls back to the Markdown source, and if neither resolves it
 * returns a 404 rather than throwing. (Documents are small fixtures, so the
 * body is read fully into memory rather than streamed.)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const doc = listSourceDocuments().find((d) => d.id === id);
  if (!doc) {
    return new Response("Document not found", { status: 404 });
  }

  try {
    const buffer = await readFile(resolve(REPO_ROOT, doc.pdf_path));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${doc.id}.pdf"`,
      },
    });
  } catch {
    // PDF missing — fall back to the Markdown source.
  }

  try {
    const markdown = await readFile(resolve(REPO_ROOT, doc.markdown_path), "utf8");
    return new Response(markdown, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch {
    return new Response("Document source is unavailable", { status: 404 });
  }
}

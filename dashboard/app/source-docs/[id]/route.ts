import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { REPO_ROOT, listSourceDocuments } from "@essos/shared";

export const dynamic = "force-dynamic";

/**
 * Serve a seeded source document. Streams the polished PDF from
 * `mock-assets/pdf/essos/` when present, falling back to the Markdown source.
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

  const pdfPath = resolve(REPO_ROOT, doc.pdf_path);
  try {
    const buffer = await readFile(pdfPath);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${doc.id}.pdf"`,
      },
    });
  } catch {
    const markdown = await readFile(resolve(REPO_ROOT, doc.markdown_path), "utf8");
    return new Response(markdown, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

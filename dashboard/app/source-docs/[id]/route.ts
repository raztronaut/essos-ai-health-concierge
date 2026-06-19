import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

export const dynamic = "force-dynamic";

// app/source-docs/[id] -> repo root is four levels up.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/**
 * Serve a seeded source document. Looks the document up in Convex, then reads
 * the polished PDF from `mock-assets/pdf/essos/` inline; falls back to the
 * Markdown source, then a 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "http://127.0.0.1:3210";
  const client = new ConvexHttpClient(convexUrl);
  const doc = await client.query(api.queries.getSourceDocument, { id });
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

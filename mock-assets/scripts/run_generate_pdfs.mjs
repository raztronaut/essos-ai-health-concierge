#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const script = join(root, "mock-assets", "scripts", "generate_pdfs.py");
const bundled = join(
  process.env.HOME ?? "",
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "bin",
  "python3",
);

const candidates = [
  process.env.PYTHON,
  existsSync(bundled) ? bundled : null,
  "python3",
].filter(Boolean);

function hasReportlab(python) {
  const result = spawnSync(python, ["-c", "import reportlab"], {
    stdio: "ignore",
  });
  return result.status === 0;
}

const python = candidates.find(hasReportlab);
if (!python) {
  console.error(
    "No Python runtime with reportlab found. Set PYTHON to a runtime with reportlab installed.",
  );
  process.exit(1);
}

const result = spawnSync(python, [script], { stdio: "inherit" });
process.exit(result.status ?? 1);

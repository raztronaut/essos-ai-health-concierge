import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The monorepo root (parent of dashboard/). Pinning this stops Next from
  // inferring the wrong root when a stray package-lock.json exists in $HOME.
  outputFileTracingRoot: resolve(here, ".."),
  // @essos/shared uses node:sqlite + import.meta.url to locate the repo root and
  // SQLite file; keep it external so it runs from node_modules at runtime rather
  // than being bundled (which would break the path resolution and the native db).
  serverExternalPackages: ["@essos/shared"],
};

export default nextConfig;

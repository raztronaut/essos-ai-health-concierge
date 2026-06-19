import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The monorepo root (parent of dashboard/). Pinning this stops Next from
  // inferring the wrong root when a stray package-lock.json exists in $HOME,
  // and lets the source-doc route read fixture files from the repo root.
  outputFileTracingRoot: resolve(here, ".."),
};

export default nextConfig;

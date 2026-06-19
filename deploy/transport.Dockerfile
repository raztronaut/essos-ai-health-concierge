# Spectrum transport (Railway). Long-running worker: holds the Spectrum
# connection and the outbound + reminder loops. Depends on the workspace
# `@essos/shared` package, so the whole repo is the build context.
FROM node:24-slim

RUN corepack enable
WORKDIR /app

COPY . .

RUN pnpm install \
  && pnpm --filter @essos/shared build

ENV NODE_ENV=production
# Worker process (no HTTP port); connects out to Spectrum, Eve, and Convex.
CMD ["pnpm", "--filter", "@essos/transport", "run", "imessage"]

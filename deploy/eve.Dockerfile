# Eve agent (Railway). Builds the isolated eve-concierge sub-project, which links
# the workspace `@essos/shared` package, so the whole repo is the build context.
FROM node:24-slim

RUN corepack enable
WORKDIR /app

COPY . .

# Build the shared client (workspace), then install + build the isolated agent.
RUN pnpm install \
  && pnpm --filter @essos/shared build \
  && pnpm -C eve-concierge install \
  && pnpm -C eve-concierge add just-bash \
  && pnpm -C eve-concierge build

ENV NODE_ENV=production
# Nitro (eve) reads $PORT; Railway injects it and routes the public domain to it.
CMD ["pnpm", "-C", "eve-concierge", "start"]

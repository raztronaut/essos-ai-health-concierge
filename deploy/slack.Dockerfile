# Slack concierge bridge (Railway). Long-running worker: holds the Slack
# Socket Mode websocket and drains the slack_outbox poll loop. Depends on the
# workspace `@essos/shared` package, so the whole repo is the build context.
FROM node:24-slim

RUN corepack enable
WORKDIR /app

COPY . .

RUN pnpm install \
  && pnpm --filter @essos/shared build

ENV NODE_ENV=production
# Worker process (no HTTP port); connects out to Slack and Convex.
CMD ["pnpm", "--filter", "@essos/slack", "run", "start"]

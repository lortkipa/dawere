# Production image: Next.js standalone server plus the schema script, which the
# entrypoint runs on every start (it is idempotent) before serving.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# SITE_URL is baked into metadata at build time. The database is not touched
# during the build, but src/db refuses to load without a URL.
ARG SITE_URL=http://localhost:3000
ENV SITE_URL=$SITE_URL \
    DATABASE_URL=postgres://build:build@127.0.0.1:1/build
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# The db/ scripts run outside the Next bundle, so give them their packages.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --chown=nextjs:nodejs db/schema.sql db/setup.mts db/reset-password.mts db/super-admin.mts ./db/
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# uploads is owned by nextjs so a fresh named volume mounted there inherits it.
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p uploads && chown nextjs:nodejs uploads

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]

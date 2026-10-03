# Debian rather than Alpine so sharp's prebuilt binaries work on both x86 and ARM.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/data/uploads

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# The migrator isn't traced into the standalone build, so bring its packages along.
COPY --from=build /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build /app/node_modules/postgres ./node_modules/postgres
COPY drizzle ./drizzle
COPY scripts/migrate.mjs scripts/docker-entrypoint.sh ./scripts/

EXPOSE 3000
ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]

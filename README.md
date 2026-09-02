# Dawere

**dawere** — a Georgian-language blogging platform where readers can chat with an article
instead of only reading it top to bottom. Ask it questions, get a summary, explore what it
covers before committing to the whole piece.

The reading experience stays primary: articles are server-rendered HTML that load fast and
index well. The chat is a panel beside them, not a replacement for them.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router, TypeScript |
| Styling | CSS |
| Database | Postgres 16 + pgvector, self-hosted via Docker Compose |
| ORM | Drizzle |
| Auth | Auth.js v5 — Google + Facebook OAuth, no passwords |
| UI language | Georgian only |

## Running locally

The Next.js app lives in `web/`. Node 20.9+, pnpm and Docker Compose are required.

### 1. Database

Postgres runs in a container defined at the repo root. It is published on **5433**, not
5432, so it does not collide with a Postgres already installed on the host.

```sh
docker compose up -d
```

### 2. Environment

```sh
cd web
cp .env.example .env
```

Fill in `AUTH_SECRET` with `openssl rand -base64 32`, then add the Google credentials
below. `.env` is gitignored; `.env.example` is the committed template.

### 3. Google OAuth

In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an
**OAuth client ID** of type *Web application* and register:

| Field | Value |
|---|---|
| Authorised JavaScript origin | `http://localhost:3000` |
| Authorised redirect URI | `http://localhost:3000/api/auth/callback/google` |

Copy the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

### 4. Migrate and run

```sh
pnpm install
pnpm db:migrate
pnpm dev      # http://localhost:3000
```

## Accounts

A person is identified by their **email address**, never by which provider they used. The first sign-in inserts one `users` row and one `accounts` row;
every later sign-in reads and writes nothing.

Sessions are signed JWT cookies, so there is no session table and no per-request database
read.

## Production build

```sh
cd web
pnpm install
pnpm build    # compiles into web/.next
pnpm start    # serves the build on http://localhost:3000
```

## License

MIT — see [LICENSE](LICENSE).

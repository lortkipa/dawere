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
| Editor | TipTap 3, storing plain HTML sanitised server-side |
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

## Writing and reading

| Route | Who it is for |
|---|---|
| `/write` | A new article. The first save creates the row and moves you to `/write/<id>`. |
| `/write/<id>` | Editing your own article. Anyone else's id is a 404. |
| `/a/<slug>` | The article itself — the URL you hand to readers. |
| `/dashboard` | Everything you have written, drafts included. |

An article is a **draft** until you publish it, and a draft has no address at
all: publishing is what mints the slug. That slug is then frozen. Retitle a
published piece as often as you like — the link people have already shared keeps
working, and the publication date does not move either.

Slugs are the title romanised (`როგორ დავწერო` → `rogor-davtsero`) plus eight
random hex characters. The suffix, not a lookup, is what makes them unique, so
publishing never has to search for a free name or retry on a clash.

### Two views of one page

`/a/<slug>` renders differently for the person who wrote it. Readers get the
article: title, byline, date, reading time. The author gets all of that plus a
panel above it holding the public URL with a copy button, the article's stats —
views, words, reading time — and the two buttons only they have, **editing**
and **delete**. Deletion asks first and cannot be undone.

Views are counted from the reader's browser, once per page view, so that a link
prefetch or a re-render never inflates the number. An author reading their own
article is not a view.

### Article HTML

The editor stores plain HTML, and the reader renders it verbatim. Everything on
the way in therefore passes through `lib/html.ts`, which allows exactly the tags
the toolbar can produce and nothing else. That runs in the Server Action rather
than in the editor, because a Server Action is a POST endpoint that anybody can
call without going near our editor.

## Production build

```sh
cd web
pnpm install
pnpm build    # compiles into web/.next
pnpm start    # serves the build on http://localhost:3000
```

## License

MIT — see [LICENSE](LICENSE).

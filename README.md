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

The Next.js app lives in `web/`. Node 20.9+ and pnpm are required.

```sh
cd web
pnpm install
pnpm dev      # http://localhost:3000
```

## Production build

```sh
cd web
pnpm install
pnpm build    # compiles into web/.next
pnpm start    # serves the build on http://localhost:3000
```

## License

MIT — see [LICENSE](LICENSE).

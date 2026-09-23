# Dawere

A blogging platform: a real rich-text editor, drafts, stats, and a feed that learns
what you read. The interface and demo content are in Georgian.

Next.js 16 · TypeScript · Postgres · Drizzle · Tailwind v4 · TipTap

---

## Run it locally

You need **Node 22.18+** and **Postgres 14+** running.

```bash
npm install
cp .env.example .env.local        # then edit DATABASE_URL (and SITE_URL in production)
createdb dawere                   # skip if the database already exists
npm run db:setup                  # tables, indexes, triggers and the editorial topics
npm run db:seed                   # optional: 5 demo writers, 14 posts (wipes all users and posts)
npm run dev
```

Open **http://localhost:3000**.

## Sign in

Any seeded account, all with the password `password123`:

| Email | Who |
|---|---|
| `nino@dawere.test` | writes about databases |
| `giorgi@dawere.test` | writes about design |
| `tamar@dawere.test` | writes about product |
| `levan@dawere.test` | writes about AI and reading |
| `ana@dawere.test` | writes about food and running |

Or create your own account at `/signup` — onboarding then asks three questions:
topics (required, seeds your feed), where you heard about us, and whether you read
or write. The last two are skippable and land in `users.discovery_source`,
`users.discovery_note` and `users.role`.

## Admin

`/admin` is for staff: users, posts, comments, topics, the team and an activity log.
Everyone else gets a 404. Access lives in `users.access`, separate from the
onboarding `role` answer:

- **admin** can create, search, filter, edit, suspend and delete members and reset their
  passwords; edit, unpublish and delete any post; delete comments; manage topics. Every
  change is written to the log.
- **super admin** can also appoint and remove admins, and edit their accounts. There is
  exactly one, enforced by a unique index.

`nikusha191208@gmail.com` becomes the super admin as soon as that account exists
(on `db:setup` if it already does, otherwise when it signs up), as long as nobody holds
the seat yet. The address is `default_super_admin_email()` in `db/schema.sql`. The
super admin hands the seat on from `/admin/team`; if that is impossible (lost password,
account gone), run `npm run admin:super -- their@email`.

A suspended account cannot sign in, and every session it had ends. Deleting an account,
or handing on the super admin seat, asks for the admin's own password.

## What to try

- **Write** — hit *Write*. Headings, bullet and numbered lists, tables, code blocks,
  quotes, images (drag, paste or upload), links, highlight, alignment. It autosaves
  (Ctrl+S saves at once); *Publish* when ready. Edits to a published post stay
  private until you press *Update*; unpublish, discard edits or delete from the ⋯ menu.
- **Search** — type in the header for instant results, or press Enter for the full page.
  Try `"dark mode"` (exact phrase), `desgin` (typo → "did you mean design?"),
  `ai eval`, or `-postgres` to exclude a word.
- **Watch the feed learn** — open and like a few posts on one topic, then reload
  *For you*. Your interests show up in Settings, where you can edit them.
- **Stats** — `/dashboard` has views, likes, comments, followers and a 30-day chart.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build and serve |
| `npm run db:setup` | apply `db/schema.sql` |
| `npm run db:reset` | drop everything, then re-apply |
| `npm run db:seed` | wipe content and reload demo data (refuses when `NODE_ENV=production`) |
| `npm run user:reset-password -- <email>` | give an account a new random password and sign it out everywhere |
| `npm run admin:super -- <email>` | make an existing account the super admin (the previous one stays an admin) |
| `npm run typecheck` / `npm run lint` | checks |

## Layout

```
db/schema.sql        source of truth for tables, indexes, triggers
db/seed.mts          demo data
src/db/schema.ts     Drizzle mirror of the SQL, for typed queries
src/lib/auth.ts      sessions (bcrypt + hashed cookie tokens), requireAdmin
src/lib/search.ts    full-text + prefix + trigram search, typo correction
src/lib/feed.ts      feed ranking
src/lib/interests.ts what nudges the feed after every interaction
src/lib/rate-limit.ts  Postgres-backed limits on sign-in, sign-up, comments, uploads
src/proxy.ts         sends signed-out visitors on private pages to /login
src/app/actions/     server actions (auth, posts, engagement, profile, admin)
src/app/admin/       the admin area; src/lib/admin.ts holds who-may-manage-whom
```

**How the feed ranks.** Every view, like, bookmark, comment, follow and search
nudges two scores: how much you like a *topic* and how much you like an *author*.
Both decay over about 60 days, so recent interest wins. Ranking mixes those with
engagement, freshness and a follow bonus, minus a penalty for posts you already
opened.

**How search works.** One Postgres index set, three strategies: `websearch_to_tsquery`
for phrases and exclusions, a `word:*` prefix query so results appear mid-word, and
trigram similarity for typos. Titles, subtitles and topic names are weighted above
body text, and results are nudged by topics you already like.

## Deploying

`npm run build && npm start` behind a TLS-terminating proxy. Set `SITE_URL` to the
public origin **before building** (it goes into metadata, `robots.txt` and
`sitemap.xml`), run `npm run db:setup` on each deploy (it is idempotent, and it is
what creates the topics onboarding asks for), and point a health check at
`/api/health`. Never run `db:seed` against production. Rate limits key on
`X-Forwarded-For`, so make sure the proxy sets it.

**With Docker** (how it runs on the NAS): copy `deploy/nas.env.example` to `.env`,
fill it in, then `docker compose up -d --build`. That builds the app, starts Postgres
beside it (not exposed), and applies the schema on every start. Data lives in the
`pgdata` and `uploads` volumes. Reset a password with
`docker compose exec app node db/reset-password.mts their@email`.

Set `SUPPORT_EMAIL` to show a contact address in the footer, on the sign-in page
("forgot password?") and under each article ("report"). There is no email-based
reset: when someone writes in, run `npm run user:reset-password -- their@email`
and pass the printed password on privately.

## Notes

- Uploaded images are written to `./uploads` and served from `/api/media/[id]`.
  Keep that directory on persistent storage, or swap `src/lib/storage.ts` for
  object storage.
- Post HTML is sanitised against an allow-list on write (`src/lib/sanitize.ts`),
  never on read.
- No email sending: sign-up is immediate, with no verification step.
- `/terms` and `/privacy` describe what the code does today. They are a starting
  point, not legal advice; have them checked before launch and keep them in step
  with any change to what is stored.

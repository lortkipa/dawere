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

Every account also gets a **handle**: the first word of the name plus the head of the row
id, so `Nikoloz Lortkipanidze` becomes `nikoloz-e722ded8`. It is the address of that
person's own page, and nobody picks it — both halves are derived, so signing up never has to
search for a free name and the address can be recomputed from the row at any time. Renaming
yourself in `/settings` is therefore what moves your page, and the only thing that does.

Auth.js knows nothing about the column, and the id it hands over is the provider's own
(Google's `sub`, which the adapter drops), so `auth.ts` does the sign-up insert itself:
one id, used both for the row and for the handle derived from it.

Sessions are signed JWT cookies, so there is no session table and no per-request read for
*authentication*. Pages still read the `users` row for the name, avatar and handle they
show, because a token minted at sign-in would otherwise keep showing a name changed in
`/settings` months ago. `lib/account.ts` holds that to one query per render.

## Writing and reading

| Route | Who it is for |
|---|---|
| `/write` | A new article. The first save creates the row and moves you to `/write/<id>`. |
| `/write/<id>` | Editing your own article. Anyone else's id is a 404. |
| `/a/<slug>` | The article itself — the URL you hand to readers. |
| `/<handle>` | Your own page, as readers get it: everything you have published. |
| `/settings` | Your name and address, the account, an export of it, and its deletion. |

An article is a **draft** until you publish it, and a draft has no address at
all: publishing is what mints the slug. That slug is then frozen. Retitle a
published piece as often as you like — the link people have already shared keeps
working, and the publication date does not move either.

Slugs are the title romanised (`როგორ დავწერო` → `rogor-davtsero`) plus eight
random hex characters. The suffix, not a lookup, is what makes them unique, so
publishing never has to search for a free name or retry on a clash.

### Two views of one page

`/a/<slug>` renders differently for the person who wrote it. Readers get the
article: title, byline, date. The author gets all of that plus a panel above it
holding the public URL with a copy button, how many views it has, and the two
buttons only they have, **editing** and **delete**. Deletion asks first and
cannot be undone.

Views are counted from the reader's browser, once per page view, so that a link
prefetch or a re-render never inflates the number. An author reading their own
article is not a view.

### Article HTML

The editor stores plain HTML, and the reader renders it verbatim. Everything on
the way in therefore passes through `lib/html.ts`, which allows exactly the tags
the toolbar can produce and nothing else. That runs in the Server Action rather
than in the editor, because a Server Action is a POST endpoint that anybody can
call without going near our editor.

## The author's page

`/<handle>` is the only list of an author's writing there is, and a strictly public one:
everything they have published, and nothing they have not. Drafts are absent even for the
person who wrote them — the page is what a reader sees, and a draft is not something a
reader can see. They are still in the export, and still open in the editor at their own
`/write/<id>`; nothing links to them. An article's byline links here, which is what turns
one piece into a way into the rest.

There is no separate private list. One page is the whole of it: the wordmark leads here from
every route a signed-in person can reach, the avatar menu names it **ჩემი გვერდი**, signing
in lands on it, and deleting an article comes back to it.

Each article is a card, and the whole card is the link — the heading stretches an overlay
over it rather than the page wrapping everything in an `<a>`, which would make the author's
buttons illegal markup inside it. To the author those cards are the same cards, plus a strip
across the foot of each holding **რედაქტირება** and **წაშლა**: the same relationship the
article page has to its author panel, so the two pages agree about what belongs to a reader
and what is added for the person who wrote it.

Deleting from here is the one place a delete does not end the page it was called from, so
`deleteArticle` takes the path to return to. It replaces rather than pushes — the author
is already standing on it — and the path is checked server-side rather than trusted, since
`redirect` accepts absolute URLs and a Server Action is a POST endpoint anyone can call.

A page with nothing on it yet gets a drawing rather than a blank (`components/ui/EmptyState`):
an author's page before they have published. Only the line above it changes with who is
reading — and the button under it, which a visitor reading someone else's empty page does not
get, along with the plus badge on the art. Nothing there is theirs to start.

Handles sit at the first segment of the site, so they share that space with every route
dawere owns — and cannot collide with one, because a handle always ends in a hyphen and
eight hex characters. Nothing has to be reserved: there is no way to be called `settings`.

## Settings

`/settings` holds four things.

**Profile.** A name and a short bio, in one Server Action. The address is shown with them
but is not a field: it follows the name, so renaming yourself moves your page and the old
address stops answering. Article links are untouched — a slug is minted once and then
frozen.

The name is held to Latin letters and at least one word, which is stricter than anything
else the platform asks of anyone. It is stricter because the first word of it becomes a URL.
A name arriving from OAuth is not held to it: nobody typed that one here, so it is romanised
instead.

**Account.** The email, which provider signed you in, and when you joined. The email is
read-only: it is the identity every provider is matched on, so changing it would mean
changing whose account this is.

**Export.** `/api/export` builds one JSON file of everything you have written — drafts
included, full HTML — and hands it straight to the browser. It is a route handler rather
than a Server Action because the answer is a download, and a download needs a real response
with a filename on it.

**Deletion.** Deleting the account deletes the `users` row; every article and every OAuth
row cascades off it. The dialog says what disappears, asks for the word წაშლა, and offers
the export first. A session here is a signed cookie rather than a row, so the action signs
you out afterwards instead of assuming the cookie died with the account.

A save answers in the same dialog a publish does — a mark, a line, and a way out, in one of
two colours (`components/ui/ResultModal`). Reporting success in a grey line beside a button
and failure somewhere else would be two designs where one does.

## Production build

```sh
cd web
pnpm install
pnpm build    # compiles into web/.next
pnpm start    # serves the build on http://localhost:3000
```

## License

MIT — see [LICENSE](LICENSE).

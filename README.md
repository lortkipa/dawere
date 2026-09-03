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
| `/feed` | The newest article from each person you follow. Where signing in lands. |
| `/search` | Authors and articles for one term. Public, like everything it finds. |
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

There is no separate private list. One page is the whole of it: the avatar menu names it
**ჩემი გვერდი** from every route a signed-in person can reach, an article's byline arrives
here, and deleting an article comes back to it. The wordmark does not lead here — it leads
to the feed, because your own page is where you publish to and the feed is where you read.

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

## Following and the feed

Following is one row — `follows(follower_id, following_id)` — and the pair is its key, so
following twice is the same row rather than a second one and unfollowing is a delete of a
row addressed by exactly what the button already knows. Both columns cascade off `users`,
so a deleted account takes its side of every relationship with it. A check constraint
refuses a self-follow; the action refuses it too, which is what turns a constraint
violation into a sentence somebody can read.

The key answers the feed's question — *who does this reader follow* — and
`follows_following_idx` answers the author page's — *how many follow them*.

**The button** is one control for both directions, because there is one row and it is
either there or it is not. It takes the state it wants to be in rather than a verb, so a
double click ends where a single one would. It paints the new state before the write
answers: the write is one row, and the round trip is not worth charging every click for the
rare wrong answer — a failure puts the button back and says why. A signed-out visitor is
shown the same button; it opens the sign-in dialog first, which is why `/<handle>` carries
the same `AuthDialogProvider` the landing page does.

**`/feed`** is **one article per author**: the newest thing each person you follow has
published, newest first. The join *is* the filter — an article is a candidate exactly when
a row says its author is followed by this reader — and `distinct on (author_id)`, ordered
by author then date, is what cuts that to the latest of each. The cut happens in the scan
rather than over rows already fetched, and the page's own order is the layer above it.

One each rather than everything, because a feed of every article is a feed of whoever
published most that week. One row apiece makes it a list of the *people* you follow, and
their page — where everything they have written is — is one click away on every card.

It is the only page assembled from more than one author, and the only one that is nobody's
address: a feed is a view of a reader, not something to hand out, so a signed-out visitor
is sent to `/`. It is also where signing in lands. Auth comes back to `/`, which is what
redirects, so the handle never has to be read to know where a new account starts.

An empty feed is two different states and says which. **Nobody followed yet** is the one
with a way out, so it gets both: the button to **ავტორების ძებნა**, and under it **the
people publishing right now** — everyone who has published, minus you and minus anybody you
already follow, most recently published first — each with the one button that would end the
emptiness. Ranking on recency rather than popularity, because there is no popularity worth
ranking on yet and a page written this morning is the one worth reading. **Followed authors
who have not published** offers nothing, because there is nothing to do about it but wait.

Both those lists of people are one component (`components/author/AuthorList`) — the empty
feed's suggestions and a search's authors are the same rows asking the same question, so
they are not two designs. It is deliberately not a card: the cards on both pages are
articles, and a hairline row keeps that difference visible.

## Search

One field, in the bar every page carries, searching **both** things there are to find: the
people and what they published. A reader looking for something does not yet know which of
the two it is, so `/search?q=` answers with authors above articles rather than making them
choose a tab first.

It is a page with an address rather than a live dropdown, so a search is linkable,
back-buttonable and shareable like everything else here. The field submits and navigates;
on `/search` it opens holding what that page searched for, so the field and the results
agree about what the question was.

Everything it can find is public, so search is public too — a signed-out visitor gets the
same results, with the follow buttons asking them to sign in first, which is why `/search`
carries the same `AuthDialogProvider` `/<handle>` does. Drafts are not results: a draft has
no address and no reader.

Matching is `ILIKE` substring over names and handles for people, titles and excerpts for
articles — not full-text, because Postgres ships no Georgian stemming and a reader typing
half a title is what the field is for. `%` and `_` are escaped into themselves: they mean
something to `ILIKE` and nothing to the person typing them. Authors are ranked by how much
they have published, articles by recency. A term under two characters is not searched at
all — one letter matches most of the site.

Below 720px the field and the wordmark cannot both have their width, so the field collapses
into the icon beside the avatar: one tap to a page that *is* a field.

## Getting to the feed

The wordmark leads there from every route a signed-in person can reach, and the avatar menu
names it **სიახლეები** above **ჩემი გვერდი** — the two halves of the platform, reading and
publishing, in the one control that is on every page. `/settings` and an article both have
that menu, so neither is a dead end.

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

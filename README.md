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
| `/notifications` | What other people have done with what you wrote. |
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
holding the public URL with a copy button, how many views and likes it has, and
the two buttons only they have, **editing** and **delete**. Deletion asks first
and cannot be undone.

Views are counted from the reader's browser, once per page view, so that a link
prefetch or a re-render never inflates the number. An author reading their own
article is not a view.

### Article HTML

The editor stores plain HTML, and the reader renders it verbatim. Everything on
the way in therefore passes through `lib/html.ts`, which allows exactly the tags
the toolbar can produce and nothing else. That runs in the Server Action rather
than in the editor, because a Server Action is a POST endpoint that anybody can
call without going near our editor.

## Under the article

Two things a reader can do with a piece once they have read it, both of them on
`/a/<slug>` and nowhere else.

### Liking

One row — `likes(article_id, user_id)` — and the pair is its key, so liking twice is
the same row rather than a second one and unliking is a delete of a row addressed by
exactly what the button already knows. The key is also both questions the page asks:
how many liked it is a prefix of it, and whether this reader is one of them is a
point lookup on the whole.

The button is the follow button's shape for an article. One control for both
directions, taking the state it wants to be in rather than a verb, painting it before
the write answers and putting it back if the answer disagrees. It carries its own
count, because that is the only place a reader is shown one.

The author is not offered it at all: liking your own article is the article's version
of following yourself, and their count is already in the panel above the piece, beside
the views — the same line the view counter draws, where reading your own article is
not a view. No check constraint can say so here, though. Whose article this is lives
in another table, so the action is the only place that can refuse it.

### Comments

A row is a thread when its `parent_id` is null and a reply when it points at one, and
it may point at any comment on the same article: a reply to a reply to a reply is a
chain of them, as deep as the conversation goes. Depth costs nothing to read back,
because a reply is always written after the comment it answers — one indexed scan in
that order hands back every parent before the rows that name it, so the tree is built
by pushing each row onto a parent already in hand.

Every level is ordered by likes, most first. The sort is stable and the count is its
only key, so everything nobody has liked keeps the order the scan gave it: threads
newest first, the way a page of comments is read, and the replies inside one oldest
first, the way a conversation is. Until somebody likes something the order is the one
it always was — which is the point. A like lifts a comment out of that order rather
than replacing it.

There is a reply control on every comment, because a reply answers the comment it sits
under and not the conversation at large. Whose reply it is gets said three ways, and a
rule down the side of the thread is none of them: a conversation five deep drawn that
way is a page of pinstripes. It is said by where the reply starts — one gutter in, so
its own name lands on the line its parent's body did. By its size — a 26px avatar under
the thread's 32px, one step down and then no further, because a size per level four
deep is a thread of thumbnails. And by proximity — 10px from the comment it answers
against 24px from the reply beside it, so it sits nearer what it is talking to than
what it is not.

What bounds a thread is the page, not the column. The indent follows a chain four
levels and then stops: past that the replies keep coming at the level they reached,
and each says whom it is answering — `↳ name`, beside the name that wrote it — because
that is the job the indent was doing until it ran out of screen to do it in. The other
two cues carry it alone there. The data knows nothing of any of this; only
`CommentSection` counts depth.

A comment is stored as the plain text it was typed as. Nothing sanitises it because
nothing renders it as HTML: the page prints the characters, so `<script>` is five
words of a sentence and not a tag. That is the opposite of an article, which *is*
HTML and is cleaned on the way in — two different kinds of thing, treated as such.

Deleting is offered to two people: whoever wrote the comment, and whoever wrote the
article it sits under, which is what makes an author's own page theirs to keep. It
asks first, like every delete here, and says how many replies are going with it — the
whole chain below it, not just the answers directly to it. `parent_id` cascades onto
itself and keeps cascading, because a reply to something nobody can read is not worth
keeping.

Comments are liked too, on `comment_likes(comment_id, user_id)` — the article's table
for the conversation, and the same key doing the same two jobs. A separate table rather
than a nullable `comment_id` on `likes`, because they are two different things being
liked and one key over both would have to say "exactly one of these is null" to stay
honest. Every comment's count and the reader's own state arrive with the threads, in a
single scan grouped by `comment_id`, rather than a query per comment; the count is only
drawn once there is one, because a nought under every line is a column of noise. You
cannot like your own comment, for the same reason an author cannot like their own
article — the tally still stands there, with no button under it.

Only the field, the reply control, the like and the delete ship as JavaScript; the
conversation itself is rendered on the server with the article above it. A posted
comment appears because the action revalidates this page, not because the client
patches it in — one description of the page, on the server, whether it is being read
or has just been written to.

A signed-out reader gets every one of these controls, each asking them to sign in
first, which is why `/a/<slug>` carries the same `AuthDialogProvider` `/<handle>` and
`/search` do. A draft gets none of them: it has no address and therefore no readers,
so there is nothing under it to have liked it or said anything about.

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

## Notifications

Five things are worth telling somebody about. Four happen to what they wrote, and each is
told to exactly one person: somebody likes the article, likes a comment on it, opens a
thread under it, or answers something they said. The fifth was not done to them at all —
**an author they follow published** — and it is the one told to more than one person.

A follow is not among them: that is the follower's business, and their name is already on
the page they followed. Nor is a view, which is a number rather than an event and has
nobody's name on it to tell.

One row — `notifications(user_id, actor_id, kind, article_id, comment_id)` — is who is
being told, who gave them something to be told about, which of the five it was, and where.
A check constraint across the first two refuses news of your own doing, the way
`follows_not_self` refuses following yourself: liking your own comment is already
impossible, commenting under your own article is not, and nobody needs telling they did.

`article_id` is on every row, not only the ones about the piece itself — all five happen to
an article, and it is the address the notification leads to. The comment, where there is
one, is the anchor inside that page: `/a/<slug>#c-<id>`, so news about one thing said in a
long thread lands on it rather than at the top of the article.

**Nothing has to be tidied up**, because every row hangs off the thing it reports. A
deleted comment takes the news of it, and its replies take theirs; a deleted article takes
the whole conversation's and the news of its own publishing; a deleted account takes both
what it was told and what it did. The one exception is a like taken back — what that row
reported was in `likes`, which the notification does not point at — so unliking deletes it
by hand, addressed by exactly what the button already knows. Which is also why a heart
pressed twice is one piece of news and not two: an insert that conflicts hands back no row,
and the notification is written only when the like was. An unfollow deletes nothing: the
article was published, and they were following when it was.

**A reply tells whoever was answered**, not the author of the piece. A reply answers the
comment it sits under, and telling the author about every reply five deep would make a busy
article unreadable to the one person who cannot walk away from it. So the author hears
about the threads on their article, and the people in a thread hear about the answers to
them.

**Publishing is told once**, at the moment the slug is minted, because that is the moment
there is something anybody could open. Retitling the piece or editing it afterwards is the
same piece and not a second one, and a draft is told to nobody at all — it has no address,
so there is nothing yet to go and read.

It is the only news that goes to more than one person, and it is the same row once per
follower rather than a shape of its own: one read of `follows` and one insert. Not an
`insert … select` over it, which would be the single statement but would have to mint the
ids in SQL — a second way of making an id, for a list that is one person's followers.

It also overlaps with `/feed`, deliberately. The feed is one article per author, so a
second piece published the same week displaces the first and the first is gone from it. The
notification is a record of each publish rather than a picture of who has written lately,
which is the difference between a place to read and a list of what happened.

**The bell** sits in the top bar beside the avatar, and it is the only place dawere
interrupts anybody: a number on a link, on whichever page they were already reading.
Nothing pushes and nothing polls — the count is read with the page, so it is exactly as
fresh as everything else on it. It leads to a page rather than dropping a panel out of the
bar, for the reason `/search` is a page: news is a list with a history, and a dropdown
would make it the one thing here that cannot be linked to, scrolled, or come back to. The
bell says how much; the page says what.

**`/notifications`** is that list, newest first, every row the same three things — who,
what they did, and the thing they did it to. A comment arrives in quotation marks because
it is speech and an article title without them because it is a name; under a comment sits
the piece it was said on, because a comment out of its article is a sentence from nowhere.
News of a publish has none of that third line — the title above it is the whole of it.
Five kinds read as one list rather than as five designs sharing a page. Nothing is grouped:
three people liking one article is three lines and not "3 people", which is worth writing
for the first person who has enough news to need it.

Unread and read are the same row with a tint and a dot between them, and what moves a row
from one to the other is opening it: the click that goes to the article marks the news
about it, from the browser, on the way out. Arriving at the page reads nothing. A list that
cleared itself on sight could only ever be looked at once, and whatever was below the fold
was never read at all.

The rest is cleared by saying so — **ყველა წაკითხულად მონიშვნა**, beside the count of what
it will clear, shown only while there is something unread. Most news is read off the list
itself: somebody liked this, somebody followed that, and only some of it is worth opening.
Without that button the badge would outlast the reading of it, and a number that will not
go down stops being read at all. It paints nothing early — the rows keep their tint until
the server says otherwise and then lose it together, which is what the press was for, and
worth a round trip to be sure of in a way a like is not. There is still no checkbox per
row: a column of them over a list of news is a second inbox to keep.

Like the feed it is a view of a reader rather than something to hand out, so a signed-out
visitor is sent to `/`. Unlike the feed it is not where signing in lands: news is something
you go and look at.

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

The bell beside the avatar is not repeated inside the menu, for the reason the write button
is not: a count nobody can see until they open something is not a count, and the same door
twice is one door too many.

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

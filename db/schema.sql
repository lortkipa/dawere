-- Dawere schema. Applied by `npm run db:setup` (idempotent-ish: run db:reset to start clean).

create extension if not exists pg_trgm;
-- levenshtein(), used to correct typos against the harvested vocabulary
create extension if not exists fuzzystrmatch;

-- ---------------------------------------------------------------- users & auth

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  name          text not null,
  username      text not null unique,
  bio           text not null default '',
  avatar_url    text,
  location      text not null default '',
  website       text not null default '',
  -- answered during onboarding; '' means skipped or not asked yet
  discovery_source text not null default '',
  discovery_note   text not null default '',
  -- 'reader' | 'writer' | 'both' | '' (skipped)
  role             text not null default '',
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- `create table if not exists` above is a no-op on an existing database, so the
-- onboarding answers are added separately for anyone who set up before them.
alter table users add column if not exists discovery_source text not null default '';
alter table users add column if not exists discovery_note   text not null default '';
alter table users add column if not exists role             text not null default '';

create index if not exists users_name_trgm_idx on users using gin (name gin_trgm_ops);
create index if not exists users_username_trgm_idx on users using gin (username gin_trgm_ops);
create index if not exists users_email_trgm_idx on users using gin (email gin_trgm_ops);

-- ------------------------------------------------------------------ staff access

-- Who may open /admin. Separate from `role` above, which is only the
-- onboarding answer ("reader" / "writer") and grants nothing.
--   'user'        everyone
--   'admin'       moderates users, posts, comments and topics
--   'super_admin' an admin who can also appoint and remove admins; exactly one
alter table users add column if not exists access text not null default 'user';
-- Set when an admin suspends the account: it cannot sign in until lifted.
alter table users add column if not exists suspended_at     timestamptz;
alter table users add column if not exists suspended_reason text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_access_check') then
    alter table users add constraint users_access_check
      check (access in ('user', 'admin', 'super_admin'));
  end if;
end $$;

-- At most one super admin, enforced by the database rather than by care.
create unique index if not exists users_one_super_admin_idx on users ((true)) where access = 'super_admin';
create index if not exists users_access_idx on users (access) where access <> 'user';

-- The address that becomes super admin while the seat is empty: on setup if the
-- account already exists, otherwise the moment it signs up. Once someone holds
-- the seat this is ignored; hand it on from /admin/team or db/super-admin.mts.
create or replace function default_super_admin_email() returns text as $$
  select 'nikusha191208@gmail.com'::text;
$$ language sql immutable;

create or replace function claim_super_admin() returns trigger as $$
begin
  if lower(new.email) = default_super_admin_email()
     and not exists (select 1 from users where access = 'super_admin') then
    new.access := 'super_admin';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_claim_super_admin on users;
create trigger users_claim_super_admin before insert on users
  for each row execute function claim_super_admin();

update users set access = 'super_admin'
where lower(email) = default_super_admin_email()
  and not exists (select 1 from users where access = 'super_admin');

-- Session tokens are stored as sha256 hashes: a database leak must not hand out live sessions.
create table if not exists sessions (
  id         text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists sessions_user_idx on sessions (user_id);
create index if not exists sessions_expires_idx on sessions (expires_at);

-- ---------------------------------------------------------------------- topics

create table if not exists topics (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  -- featured topics are the ones offered on the onboarding screen
  is_featured boolean not null default false,
  post_count  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists topics_name_trgm_idx on topics using gin (name gin_trgm_ops);
create index if not exists topics_featured_idx on topics (is_featured, post_count desc);

-- ----------------------------------------------------------------------- posts

create table if not exists posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references users(id) on delete cascade,
  slug            text not null unique,
  title           text not null default '',
  subtitle        text not null default '',
  content_html    text not null default '',
  -- plain-text mirror of content_html, kept by the app; feeds the search vector
  content_text    text not null default '',
  -- topic names, maintained by trigger, so searching "design" finds posts tagged
  -- Design even when the word never appears in the body
  topics_text     text not null default '',
  cover_image_url text,
  status          text not null default 'draft' check (status in ('draft', 'published')),
  reading_minutes integer not null default 1,
  view_count      integer not null default 0,
  like_count      integer not null default 0,
  comment_count   integer not null default 0,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- 'simple' rather than 'english': Postgres ships no Georgian dictionary, and
  -- the English stemmer and stop-word list have nothing useful to say about
  -- Georgian. 'simple' folds case and indexes every token as written.
  search_vector   tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(subtitle, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(topics_text, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(content_text, '')), 'C')
  ) stored
);

-- A database created before the switch still carries the English-configured
-- column; a generated column cannot be altered in place, so rebuild it.
do $$
begin
  if exists (
    select 1 from pg_attrdef d
    join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
    where d.adrelid = 'posts'::regclass
      and a.attname = 'search_vector'
      and pg_get_expr(d.adbin, d.adrelid) like '%english%'
  ) then
    alter table posts drop column search_vector;
    alter table posts add column search_vector tsvector generated always as (
      setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(subtitle, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(topics_text, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(content_text, '')), 'C')
    ) stored;
  end if;
end $$;

create index if not exists posts_search_idx on posts using gin (search_vector);
create index if not exists posts_title_trgm_idx on posts using gin (title gin_trgm_ops);
create index if not exists posts_feed_idx on posts (published_at desc) where status = 'published';
create index if not exists posts_author_idx on posts (author_id, status, updated_at desc);

create table if not exists post_topics (
  post_id  uuid not null references posts(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (post_id, topic_id)
);

create index if not exists post_topics_topic_idx on post_topics (topic_id);

-- ------------------------------------------------------------------ engagement

create table if not exists post_views (
  id         bigserial primary key,
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid references users(id) on delete set null,
  -- user id for members, a signed anonymous cookie id otherwise
  viewer_key text not null,
  created_at timestamptz not null default now(),
  view_day   date generated always as ((created_at at time zone 'UTC')::date) stored
);

-- one counted view per viewer per post per day
create unique index if not exists post_views_daily_idx on post_views (post_id, viewer_key, view_day);
create index if not exists post_views_post_idx on post_views (post_id, created_at desc);

create table if not exists likes (
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists likes_user_idx on likes (user_id, created_at desc);

create table if not exists bookmarks (
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists bookmarks_user_idx on bookmarks (user_id, created_at desc);

create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  author_id  uuid not null references users(id) on delete cascade,
  parent_id  uuid references comments(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on comments (post_id, created_at);

-- Replies nest to any depth: parent_id points at the comment actually answered.
-- A comment deleted while it still has replies keeps its row (body cleared,
-- deleted_at set) so the conversation under it stays in place.
alter table comments add column if not exists like_count integer not null default 0;
alter table comments add column if not exists edited_at  timestamptz;
alter table comments add column if not exists deleted_at timestamptz;

create index if not exists comments_parent_idx on comments (parent_id);

create table if not exists comment_likes (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists comment_likes_user_idx on comment_likes (user_id, created_at desc);

create table if not exists follows (
  follower_id  uuid not null references users(id) on delete cascade,
  following_id uuid not null references users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on follows (following_id);

-- -------------------------------------------------------------- personalisation

-- Affinity scores decay toward zero over ~60 days and are topped up by every
-- signal (view, like, comment, bookmark, follow, search). See src/lib/interests.ts.
create table if not exists topic_affinity (
  user_id    uuid not null references users(id) on delete cascade,
  topic_id   uuid not null references topics(id) on delete cascade,
  score      real not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create index if not exists topic_affinity_score_idx on topic_affinity (user_id, score desc);

create table if not exists author_affinity (
  user_id    uuid not null references users(id) on delete cascade,
  author_id  uuid not null references users(id) on delete cascade,
  score      real not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, author_id)
);

create index if not exists author_affinity_score_idx on author_affinity (user_id, score desc);

create table if not exists search_events (
  id         bigserial primary key,
  user_id    uuid references users(id) on delete cascade,
  query      text not null,
  created_at timestamptz not null default now()
);

create index if not exists search_events_user_idx on search_events (user_id, created_at desc);

-- Vocabulary harvested from titles, subtitles and topic names. Used only to
-- answer "did you mean …?" when a query returns nothing.
create table if not exists search_terms (
  term text primary key
);

create index if not exists search_terms_length_idx on search_terms (length(term));

-- ----------------------------------------------------------------------- media

create table if not exists media (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references users(id) on delete set null,
  mime_type    text not null,
  byte_size    integer not null,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------------- triggers

create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_touch on users;
create trigger users_touch before update on users
  for each row execute function touch_updated_at();

drop trigger if exists posts_touch on posts;
create trigger posts_touch before update on posts
  for each row execute function touch_updated_at();

-- Denormalised counters keep feed ranking to a single pass over posts.
create or replace function bump_like_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update posts set like_count = like_count + 1 where id = new.post_id;
  else
    update posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists likes_count on likes;
create trigger likes_count after insert or delete on likes
  for each row execute function bump_like_count();

-- Counts comments readers can see: a soft-deleted placeholder leaves the count
-- when it is emptied, and is not counted a second time when its row goes.
create or replace function bump_comment_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    if old.deleted_at is null then
      update posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
    end if;
  elsif old.deleted_at is null and new.deleted_at is not null then
    update posts set comment_count = greatest(0, comment_count - 1) where id = new.post_id;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists comments_count on comments;
create trigger comments_count after insert or delete or update of deleted_at on comments
  for each row execute function bump_comment_count();

create or replace function bump_comment_like_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update comments set like_count = like_count + 1 where id = new.comment_id;
  else
    update comments set like_count = greatest(0, like_count - 1) where id = old.comment_id;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists comment_likes_count on comment_likes;
create trigger comment_likes_count after insert or delete on comment_likes
  for each row execute function bump_comment_like_count();

create or replace function bump_view_count() returns trigger as $$
begin
  update posts set view_count = view_count + 1 where id = new.post_id;
  return null;
end;
$$ language plpgsql;

drop trigger if exists post_views_count on post_views;
create trigger post_views_count after insert on post_views
  for each row execute function bump_view_count();

-- topics.post_count counts published posts only: a draft tagged "design" must
-- not make an empty topic page claim one article. Recounting rather than
-- incrementing keeps it right through publish, unpublish and cascaded deletes
-- (by the time a cascade removes the tags, the post row is already gone).
create or replace function recount_topic(target uuid) returns void as $$
  update topics set post_count = (
    select count(*)
    from post_topics pt
    join posts p on p.id = pt.post_id
    where pt.topic_id = target and p.status = 'published'
  )
  where id = target;
$$ language sql;

create or replace function bump_topic_post_count() returns trigger as $$
begin
  perform recount_topic(coalesce(new.topic_id, old.topic_id));
  return null;
end;
$$ language plpgsql;

drop trigger if exists post_topics_count on post_topics;
create trigger post_topics_count after insert or delete on post_topics
  for each row execute function bump_topic_post_count();

create or replace function recount_post_topics() returns trigger as $$
begin
  perform recount_topic(pt.topic_id) from post_topics pt where pt.post_id = new.id;
  return null;
end;
$$ language plpgsql;

drop trigger if exists posts_status_topic_count on posts;
create trigger posts_status_topic_count after update of status on posts
  for each row when (old.status is distinct from new.status) execute function recount_post_topics();

-- Earlier versions counted drafts too; bring every row in line.
update topics t set post_count = coalesce((
  select count(*)
  from post_topics pt
  join posts p on p.id = pt.post_id
  where pt.topic_id = t.id and p.status = 'published'
), 0)
where t.post_count is distinct from coalesce((
  select count(*)
  from post_topics pt
  join posts p on p.id = pt.post_id
  where pt.topic_id = t.id and p.status = 'published'
), 0);

-- Keeps posts.topics_text (and therefore the search vector) in step with tags.
create or replace function sync_topics_text() returns trigger as $$
declare
  target uuid := coalesce(new.post_id, old.post_id);
begin
  update posts set topics_text = coalesce((
    select string_agg(t.name, ' ')
    from post_topics pt
    join topics t on t.id = pt.topic_id
    where pt.post_id = target
  ), '')
  where id = target;
  return null;
end;
$$ language plpgsql;

drop trigger if exists post_topics_text on post_topics;
create trigger post_topics_text after insert or delete on post_topics
  for each row execute function sync_topics_text();

create or replace function harvest_search_terms() returns trigger as $$
begin
  insert into search_terms (term)
  -- [[:alnum:]] rather than a-z0-9: an ASCII class would treat every Georgian
  -- letter as a separator and harvest nothing at all.
  select distinct word
  from regexp_split_to_table(
    lower(coalesce(new.title, '') || ' ' || coalesce(new.subtitle, '') || ' ' || coalesce(new.topics_text, '')),
    '[^[:alnum:]]+'
  ) as word
  where length(word) >= 4
  on conflict (term) do nothing;
  return null;
end;
$$ language plpgsql;

-- `status` is in the column list because titles are written while the post is
-- still a draft (when the trigger skips it); publishing changes only the status.
drop trigger if exists posts_harvest_terms on posts;
create trigger posts_harvest_terms after insert or update of title, subtitle, topics_text, status on posts
  for each row when (new.status = 'published') execute function harvest_search_terms();

-- Posts published before `status` joined the list above were never harvested.
insert into search_terms (term)
select distinct word
from posts p,
  regexp_split_to_table(
    lower(p.title || ' ' || p.subtitle || ' ' || p.topics_text),
    '[^[:alnum:]]+'
  ) as word
where p.status = 'published' and length(word) >= 4
on conflict (term) do nothing;

-- ----------------------------------------------------------------- topic names

-- Topics used to be matched by slug alone, so typing a seeded topic's Georgian
-- name ("მონაცემთა ბაზები", slug "databases") minted a twin under the
-- transliterated slug. Fold each twin into its busiest copy, then keep names
-- unique so it cannot happen again.
do $$
declare
  twin record;
begin
  for twin in
    select id, keeper from (
      select id, first_value(id) over (
        partition by lower(name)
        order by is_featured desc, post_count desc, created_at
      ) as keeper
      from topics
    ) ranked
    where id <> keeper
  loop
    insert into post_topics (post_id, topic_id)
      select post_id, twin.keeper from post_topics where topic_id = twin.id
      on conflict do nothing;
    insert into topic_affinity (user_id, topic_id, score, updated_at)
      select user_id, twin.keeper, score, updated_at from topic_affinity where topic_id = twin.id
      on conflict (user_id, topic_id) do update
        set score = greatest(topic_affinity.score, excluded.score),
            updated_at = greatest(topic_affinity.updated_at, excluded.updated_at);
    delete from topics where id = twin.id;
  end loop;
end;
$$;

create unique index if not exists topics_name_lower_idx on topics (lower(name));

-- ------------------------------------------------------------ pending edits

-- Edits to a published post are held here until the author presses "update",
-- so autosave never pushes a half-typed sentence to readers. Shape:
-- { title, subtitle, contentHtml, coverImageUrl, topics: string[] }.
alter table posts add column if not exists pending_revision jsonb;

-- ---------------------------------------------------------------- rate limits

-- Fixed-window counters keyed by action and caller ("signin:ip:1.2.3.4").
-- Kept in Postgres so limits hold across restarts and multiple app instances.
create table if not exists rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        integer not null default 0
);

create index if not exists rate_limits_window_idx on rate_limits (window_start);

-- ------------------------------------------------------------------ admin log

-- Every change made from /admin, so there is always an answer to "who did
-- this?". Names are copied at write time: the log must stay readable after the
-- admin or the thing they acted on is deleted.
create table if not exists admin_log (
  id           bigserial primary key,
  actor_id     uuid references users(id) on delete set null,
  actor_name   text not null,
  action       text not null,
  -- 'user' | 'post' | 'comment' | 'topic'
  target_type  text not null,
  target_id    text,
  target_label text not null default '',
  details      jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists admin_log_created_idx on admin_log (created_at desc);
create index if not exists admin_log_target_idx on admin_log (target_type, target_id, created_at desc);

-- --------------------------------------------------------------------- reports

-- A reader flagging a post, a comment or a profile for the admins. The target
-- is polymorphic, so its label and an excerpt are copied at report time: the
-- admin must see what was reported even after it is edited or deleted.
create table if not exists reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid references users(id) on delete set null,
  target_type     text not null check (target_type in ('post', 'comment', 'user')),
  target_id       uuid not null,
  -- whoever wrote the reported thing; the account itself for a profile
  target_owner_id uuid references users(id) on delete set null,
  target_label    text not null default '',
  target_excerpt  text not null default '',
  reason          text not null check (reason in (
    'spam', 'harassment', 'hate', 'violence', 'sexual', 'misinformation', 'impersonation', 'copyright', 'other'
  )),
  details         text not null default '',
  -- 'open' until an admin acts: 'resolved' (dealt with) or 'dismissed' (no breach)
  status          text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by     uuid references users(id) on delete set null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- One open report per reader per target: pressing it twice adds nothing.
create unique index if not exists reports_one_open_idx on reports (reporter_id, target_type, target_id) where status = 'open';
create index if not exists reports_status_idx on reports (status, created_at desc);
create index if not exists reports_target_idx on reports (target_type, target_id);

create index if not exists comments_created_idx on comments (created_at desc);
create index if not exists comments_body_trgm_idx on comments using gin (body gin_trgm_ops);
create index if not exists users_created_idx on users (created_at desc);

-- ------------------------------------------------------------ editorial topics

-- The curated set offered during onboarding and in topic rails. Onboarding
-- requires picking three, so a fresh database needs these before anyone can
-- sign up. Existing rows are left alone: edit names and descriptions in place.
insert into topics (slug, name, description, is_featured) values
  ('writing',     'წერა',                'ოსტატობა, ხმა და დისციპლინა, რომელიც ტექსტს ასრულებს.', true),
  ('books',       'წიგნები',             'რას ვკითხულობთ, რატომ და რა გვრჩება ბოლო გვერდის შემდეგ.', true),
  ('culture',     'კულტურა',             'ხელოვნება, ტრადიციები და ის, რაც ჩვენს ყოველდღიურობას აყალიბებს.', true),
  ('history',     'ისტორია',             'ადამიანები, მოვლენები და წარსული, რომელიც აწმყოს ხსნის.', true),
  ('cinema',      'კინო',                'ფილმები, სერიალები და ისტორიები ეკრანზე.', true),
  ('music',       'მუსიკა',              'ალბომები, კონცერტები და ხმები, რომლებიც გვახსოვს.', true),
  ('travel',      'მოგზაურობა',          'ადგილები, რომლებიც ფრენად ღირს, და როგორ ვნახოთ ისინი სწორად.', true),
  ('food',        'საკვები',             'კულინარია, ტექნიკა და კარგად ჭამა ჩვეულებრივ სამშაბათს.', true),
  ('health',      'ჯანმრთელობა',         'ძილი, ვარჯიში და კარგად ყოფნის გრძელი თამაში.', true),
  ('sports',      'სპორტი',              'თამაშები, ვარჯიში და გამარჯვების ფსიქოლოგია.', true),
  ('science',     'მეცნიერება',          'კვლევები, ექსპერიმენტები და როგორ ვიგებთ იმას, რაც ვიცით.', true),
  ('education',   'განათლება',           'სწავლა, სწავლება და ცოდნა, რომელიც სკოლის შემდეგაც გრძელდება.', true),
  ('engineering', 'ინჟინერია',           'სისტემები, ენები და პროგრამული უზრუნველყოფის შექმნის ხელოვნება.', true),
  ('ai',          'ხელოვნური ინტელექტი', 'მოდელები, აგენტები და ყველაფერი, რაც მათგან გამომდინარეობს.', true),
  ('design',      'დიზაინი',             'ინტერფეისები, ტიპოგრაფია და ის, რაც პროდუქტს სწორ შეგრძნებას აძლევს.', true),
  ('product',     'პროდუქტი',            'კვლევა, გეგმები და გადაწყვეტილება, თუ რა ავაშენოთ შემდეგ.', true),
  ('startups',    'სტარტაპები',          'დაფუძნება, დაფინანსება და არეული შუა გზა.', true),
  ('career',      'კარიერა',             'ზრდა, გასაუბრებები და პროფესიაში ორიენტირება.', true),
  ('finance',     'ფინანსები',           'ბაზრები, ფული და თავისუფლების არითმეტიკა.', true)
on conflict do nothing;

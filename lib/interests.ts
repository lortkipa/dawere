import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { users, type User } from "./db/schema";
import { minTopics, topics } from "./onboarding-options";

// What a reader actually reads, learned per tag from the last 90 days. Every event is worth
// points, spread evenly over the post's tags, and halves in weight every 14 days.
const windowDays = 90;
const halfLifeDays = 14;
const points = { opened: 1, liked: 3, commented: 3, favorited: 4, skipped: -0.3 };
// A card counts as skipped once it was on screen this long ago without being opened.
const skipAfterDays = 1;

// The feed takes the strongest positive tags only; they travel in the feed cursor.
const maxLearnedTags = 30;

// Adjusting the topic list itself: checked on every feed visit, changed at most once a day and
// one topic each way.
const tuneEveryHours = 24;
const addMinScore = 6;
const addMinPosts = 3;
const removeMinSkipped = 10;
const removeSkippedDays = 30;
const handEditGraceDays = 30;

export type Interest = {
  tag: string;
  score: number;
  // Posts the reader opened, liked, commented on or saved.
  engaged: number;
  // Posts first seen in the last 30 days that they never opened, liked or saved.
  skipped: number;
};

// Only events before `asOf` count, so every page of one feed visit sees the same numbers.
export async function getInterests(userId: string, asOf: Date): Promise<Interest[]> {
  const at = sql`${asOf.toISOString()}::timestamptz`;
  const since = sql`${at} - ${`${windowDays} days`}::interval`;
  const skippedBefore = sql`${at} - ${`${skipAfterDays} days`}::interval`;
  const skippedSince = sql`${at} - ${`${removeSkippedDays} days`}::interval`;

  const rows = await db.execute<{ tag: string; score: number; engaged: number; skipped: number }>(sql`
    with events as (
      select post_id, ${points.opened}::float8 as points, opened_at as at from post_views
        where user_id = ${userId} and opened_at >= ${since} and opened_at < ${at}
      union all
      select post_id, ${points.liked}, created_at from post_likes
        where user_id = ${userId} and created_at >= ${since} and created_at < ${at}
      union all
      select post_id, ${points.commented}, max(created_at) from comments
        where user_id = ${userId} and body is not null and created_at >= ${since} and created_at < ${at}
        group by post_id
      union all
      select post_id, ${points.favorited}, created_at from post_favorites
        where user_id = ${userId} and created_at >= ${since} and created_at < ${at}
      union all
      select pv.post_id, ${points.skipped}, pv.seen_at from post_views pv
        where pv.user_id = ${userId} and pv.seen_at >= ${since} and pv.seen_at < ${skippedBefore}
          and (pv.opened_at is null or pv.opened_at >= ${at})
          and not exists (select 1 from post_likes l where l.user_id = ${userId} and l.post_id = pv.post_id and l.created_at < ${at})
          and not exists (select 1 from post_favorites f where f.user_id = ${userId} and f.post_id = pv.post_id and f.created_at < ${at})
    )
    select
      tag,
      sum(e.points * power(0.5, extract(epoch from (${at} - e.at)) / 86400 / ${halfLifeDays}) / cardinality(p.tags))::float8 as score,
      count(distinct e.post_id) filter (where e.points > 0)::int as engaged,
      count(distinct e.post_id) filter (where e.points < 0 and e.at >= ${skippedSince})::int as skipped
    from events e
    join posts p on p.id = e.post_id and p.user_id <> ${userId} and cardinality(p.tags) > 0
    cross join unnest(p.tags) as tag
    group by tag
  `);
  return rows.map((row) => ({
    tag: row.tag,
    score: Number(row.score),
    engaged: Number(row.engaged),
    skipped: Number(row.skipped),
  }));
}

// The tag weights the feed adds to a post's score. Rounded, so they come back from the cursor
// exactly as the first page used them.
export function learnedWeights(interests: Interest[]): Record<string, number> {
  return Object.fromEntries(
    interests
      .filter((interest) => interest.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxLearnedTags)
      .map((interest) => [interest.tag, Math.round(interest.score * 1000) / 1000]),
  );
}

export function isLearnedWeights(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length <= maxLearnedTags &&
    entries.every(([tag, weight]) => tag.length <= 30 && typeof weight === "number" && Number.isFinite(weight))
  );
}

// Adds an onboarding topic the reader keeps reading and drops a chosen one they keep scrolling
// past, at most one each way a day. The day counts from the last change, so a check that changes
// nothing doesn't hold back the next visit. A topic removed by hand is never added back, and
// nothing is removed for 30 days after the reader picked topics themselves. Returns the topics.
export async function tuneTopics(user: User, interests: Interest[], now: Date): Promise<string[]> {
  const current = user.topics ?? [];
  if (user.topicsTunedAt && now.getTime() - user.topicsTunedAt.getTime() < tuneEveryHours * 3600_000) {
    return current;
  }

  const byTag = new Map(interests.map((interest) => [interest.tag, interest]));
  const added = topics
    .map((topic) => byTag.get(topic.slug))
    .filter(
      (interest): interest is Interest =>
        !!interest &&
        !current.includes(interest.tag) &&
        !user.dismissedTopics.includes(interest.tag) &&
        interest.score >= addMinScore &&
        interest.engaged >= addMinPosts,
    )
    .sort((a, b) => b.score - a.score)[0];

  const handEditedRecently =
    user.topicsEditedAt && now.getTime() - user.topicsEditedAt.getTime() < handEditGraceDays * 86400_000;
  const removed = handEditedRecently
    ? undefined
    : current
        .map((slug) => byTag.get(slug))
        .filter(
          (interest): interest is Interest =>
            !!interest && interest.engaged === 0 && interest.skipped >= removeMinSkipped,
        )
        .sort((a, b) => b.skipped - a.skipped)[0];

  let next = added ? [...current, added.tag] : current;
  if (removed && next.length > minTopics) next = next.filter((slug) => slug !== removed.tag);
  if (next === current) return current;

  await db.update(users).set({ topics: next, topicsTunedAt: now }).where(eq(users.id, user.id));
  return next;
}

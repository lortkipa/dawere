import 'server-only';

import { sql } from 'drizzle-orm';
import { db } from '@/db';

/**
 * Dawere's personalisation model.
 *
 * Every interaction nudges two scores: how much a reader likes a *topic* and how
 * much they like an *author*. Scores decay exponentially (time constant below),
 * so last month's curiosity fades while this week's interests dominate the feed.
 * The decay is applied lazily at write time, which keeps reads to a plain join.
 */

export const SIGNAL = {
  /** Opening a post. The weakest signal — it may just be a good headline. */
  view: 1,
  /** Opening a post from a search result: the reader went looking for this. */
  searchOpen: 2,
  /** Typing a query that matches a topic name. */
  search: 2,
  comment: 2.5,
  bookmark: 3,
  like: 3,
  follow: 5,
  /** Picked by hand, at onboarding or in settings. */
  chosen: 8,
} as const;

export type Signal = keyof typeof SIGNAL;

/** Days for a score to decay to 1/e of its value. */
const DECAY_DAYS = 60;
const MAX_SCORE = 250;

const decayed = (table: string) =>
  sql.raw(
    `${table}.score * exp(-extract(epoch from (now() - ${table}.updated_at)) / ${DECAY_DAYS * 86400}.0)`,
  );

/** Applies a weight to every topic in the list, creating rows as needed. */
export async function recordTopicSignal(userId: string, topicIds: string[], weight: number) {
  if (topicIds.length === 0 || weight === 0) return;
  await db.execute(sql`
    insert into topic_affinity (user_id, topic_id, score)
    select ${userId}::uuid, t.id, ${weight}::real
    from unnest(${sql.param(topicIds)}::uuid[]) as t(id)
    on conflict (user_id, topic_id) do update
      set score = least(${MAX_SCORE}::real, (${decayed('topic_affinity')} + excluded.score)::real),
          updated_at = now()
  `);
}

/** Drops topics from a reader's interests outright; reading can bring them back. */
export async function forgetTopics(userId: string, topicIds: string[]) {
  if (topicIds.length === 0) return;
  await db.execute(sql`
    delete from topic_affinity
    where user_id = ${userId}::uuid and topic_id = any(${sql.param(topicIds)}::uuid[])
  `);
}

export async function recordAuthorSignal(userId: string, authorId: string, weight: number) {
  if (userId === authorId || weight === 0) return;
  await db.execute(sql`
    insert into author_affinity (user_id, author_id, score)
    values (${userId}::uuid, ${authorId}::uuid, ${weight}::real)
    on conflict (user_id, author_id) do update
      set score = least(${MAX_SCORE}::real, (${decayed('author_affinity')} + excluded.score)::real),
          updated_at = now()
  `);
}

/**
 * The main entry point: one interaction with a post teaches the feed about both
 * its topics and its author. Fire-and-forget — personalisation must never break
 * the interaction that produced it.
 */
export async function recordPostSignal(userId: string | null, postId: string, signal: Signal) {
  if (!userId) return;
  const weight = SIGNAL[signal];
  try {
    const rows = await db.execute<{ author_id: string; topic_ids: string[] }>(sql`
      select p.author_id,
             coalesce(array_agg(pt.topic_id) filter (where pt.topic_id is not null), '{}') as topic_ids
      from posts p
      left join post_topics pt on pt.post_id = p.id
      where p.id = ${postId}::uuid
      group by p.author_id
    `);
    const row = rows[0];
    if (!row) return;
    await Promise.all([
      recordTopicSignal(userId, row.topic_ids ?? [], weight),
      recordAuthorSignal(userId, row.author_id, weight),
    ]);
  } catch (error) {
    console.error('[interests] failed to record post signal', error);
  }
}

/**
 * Logs a search and, when the query looks like a topic the reader cares about,
 * boosts that topic. Trigram similarity catches "javscript" → "JavaScript".
 */
export async function recordSearchSignal(userId: string | null, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    await db.execute(sql`insert into search_events (user_id, query) values (${userId ?? null}, ${trimmed})`);
    if (!userId) return;
    const rows = await db.execute<{ id: string }>(sql`
      select id from topics
      where lower(name) = lower(${trimmed})
         or lower(slug) = lower(${trimmed})
         or similarity(name, ${trimmed}) > 0.55
      order by similarity(name, ${trimmed}) desc
      limit 3
    `);
    await recordTopicSignal(
      userId,
      rows.map((r) => r.id),
      SIGNAL.search,
    );
  } catch (error) {
    console.error('[interests] failed to record search signal', error);
  }
}

export async function recordFollowSignal(userId: string, authorId: string) {
  try {
    await recordAuthorSignal(userId, authorId, SIGNAL.follow);
  } catch (error) {
    console.error('[interests] failed to record follow signal', error);
  }
}

/** The reader's strongest topics, shown (and editable) in settings. */
export async function topInterests(userId: string, limit = 6) {
  return db.execute<{ id: string; name: string; slug: string; score: number }>(sql`
    select t.id, t.name, t.slug, ${decayed('ta')} as score
    from topic_affinity ta
    join topics t on t.id = ta.topic_id
    where ta.user_id = ${userId}::uuid and ta.score > 0.5
    order by score desc
    limit ${limit}
  `);
}

/**
 * Whether a topic currently counts among the reader's interests — the same
 * threshold settings uses, so the topic page and settings never disagree.
 */
export async function isFollowingTopic(userId: string, topicId: string): Promise<boolean> {
  const rows = await db.execute<{ on: boolean }>(sql`
    select exists (
      select 1 from topic_affinity
      where user_id = ${userId}::uuid and topic_id = ${topicId}::uuid and score > 0.5
    ) as on
  `);
  return Boolean(rows[0]?.on);
}

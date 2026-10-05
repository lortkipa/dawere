import "server-only";
import { and, asc, count, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { adminPageSize, choice, dayParam, likePattern, pageParam, param, type SearchParams } from "./admin-list";
import { db } from "./db";
import { aiChats, aiMessages, posts, users } from "./db/schema";
import { postIdPattern, uuidPattern } from "./ids";

export const chatSorts = ["new", "old", "questions"] as const;
const answerFilters = ["", "failed"] as const;

export function chatFilters(params: SearchParams) {
  const user = param(params, "user");
  const post = param(params, "post");
  return {
    q: param(params, "q"),
    user: uuidPattern.test(user) ? user : "",
    post: postIdPattern.test(post) ? post : "",
    answer: choice(params, "answer", answerFilters),
    from: dayParam(params, "from"),
    to: dayParam(params, "to"),
    sort: choice(params, "sort", chatSorts),
    page: pageParam(params),
  };
}

export type ChatFilters = ReturnType<typeof chatFilters>;

// Spelled out with the table, so inside a subquery "id" can't mean the subquery's own table.
const chatId = sql`${aiChats}.id`;
const questionCount = sql<number>`(select count(*) from ai_messages m where m.chat_id = ${chatId} and m.role = 'user')::int`;
const firstQuestion = sql<string>`(select m.text from ai_messages m where m.chat_id = ${chatId} and m.role = 'user' order by m.created_at limit 1)`;
const hasFailed = sql<boolean>`exists (select 1 from ai_messages m where m.chat_id = ${chatId} and m.failed)`;

export async function listChats(filters: ChatFilters, pageSize = adminPageSize) {
  const conditions: (SQL | undefined)[] = [];
  if (filters.q) {
    const pattern = likePattern(filters.q);
    conditions.push(
      or(
        sql`exists (select 1 from ai_messages m where m.chat_id = ${chatId} and m.text ilike ${pattern})`,
        ilike(users.name, pattern),
        ilike(users.handle, pattern),
        ilike(posts.title, pattern),
      ),
    );
  }
  if (filters.user) conditions.push(eq(aiChats.userId, filters.user));
  if (filters.post) conditions.push(eq(aiChats.postId, filters.post));
  if (filters.answer === "failed") conditions.push(hasFailed);
  if (filters.from) conditions.push(gte(aiChats.createdAt, sql`${filters.from}::date`));
  if (filters.to) conditions.push(lt(aiChats.createdAt, sql`${filters.to}::date + 1`));
  const where = and(...conditions);

  const order = {
    new: [desc(aiChats.createdAt)],
    old: [asc(aiChats.createdAt)],
    questions: [desc(questionCount), desc(aiChats.createdAt)],
  }[filters.sort];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: aiChats.id,
        createdAt: aiChats.createdAt,
        questions: questionCount,
        firstQuestion,
        failed: hasFailed,
        postId: posts.id,
        postTitle: posts.title,
        userId: users.id,
        userName: users.name,
        userHandle: users.handle,
        userAvatar: users.avatar,
      })
      .from(aiChats)
      .innerJoin(users, eq(users.id, aiChats.userId))
      .innerJoin(posts, eq(posts.id, aiChats.postId))
      .where(where)
      .orderBy(...order, desc(aiChats.id))
      .limit(pageSize)
      .offset((filters.page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(aiChats)
      .innerJoin(users, eq(users.id, aiChats.userId))
      .innerJoin(posts, eq(posts.id, aiChats.postId))
      .where(where),
  ]);
  return { rows, total };
}

export type AdminChat = Awaited<ReturnType<typeof listChats>>["rows"][number];

export async function getChat(id: string) {
  if (!uuidPattern.test(id)) return null;
  const [chat] = await db
    .select({
      id: aiChats.id,
      createdAt: aiChats.createdAt,
      post: { id: posts.id, title: posts.title },
      postAuthorHandle: sql<string>`(select u.handle from users u where u.id = ${posts.userId})`,
      user: { id: users.id, name: users.name, handle: users.handle, avatar: users.avatar },
    })
    .from(aiChats)
    .innerJoin(users, eq(users.id, aiChats.userId))
    .innerJoin(posts, eq(posts.id, aiChats.postId))
    .where(eq(aiChats.id, id))
    .limit(1);
  if (!chat) return null;
  const messages = await db
    .select({
      id: aiMessages.id,
      role: aiMessages.role,
      text: aiMessages.text,
      failed: aiMessages.failed,
      createdAt: aiMessages.createdAt,
    })
    .from(aiMessages)
    .where(eq(aiMessages.chatId, id))
    .orderBy(asc(aiMessages.createdAt), asc(aiMessages.id));
  return { ...chat, messages };
}

// How many chats a user started, or were held on a blog, for the stat tiles that link here.
export async function chatCount(column: "user" | "post", id: string) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(aiChats)
    .where(eq(column === "user" ? aiChats.userId : aiChats.postId, id));
  return total;
}

import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { aiChats, aiMessages } from "./db/schema";
import { uuidPattern } from "./ids";

// The reader's chat about this post, or a new one when `chatId` isn't theirs or is missing.
export async function openChat(userId: string, postId: string, chatId: unknown) {
  if (typeof chatId === "string" && uuidPattern.test(chatId)) {
    const [chat] = await db
      .select({ id: aiChats.id })
      .from(aiChats)
      .where(and(eq(aiChats.id, chatId), eq(aiChats.userId, userId), eq(aiChats.postId, postId)))
      .limit(1);
    if (chat) return chat.id;
  }
  const [chat] = await db.insert(aiChats).values({ userId, postId }).returning({ id: aiChats.id });
  return chat.id;
}

export async function saveMessage(chatId: string, role: "user" | "ai", text: string, failed = false) {
  await db.insert(aiMessages).values({ chatId, role, text, failed });
}

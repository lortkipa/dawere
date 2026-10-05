import { and, eq } from "drizzle-orm";
import { openChat, saveMessage } from "@/lib/ai-chats";
import { aiConfigured, askAboutPost, maxMessageLength, maxMessages, type ChatMessage } from "@/lib/ask-ai";
import { notBanned } from "@/lib/bans";
import { db } from "@/lib/db";
import { posts, users } from "@/lib/db/schema";
import { postIdPattern } from "@/lib/ids";
import { getCurrentUser } from "@/lib/session";

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const { role, text } = value as Record<string, unknown>;
  return (
    (role === "user" || role === "ai") &&
    typeof text === "string" &&
    text.trim() !== "" &&
    text.length <= maxMessageLength
  );
}

/*
  The reading chat: streams the answer to the last question about a post as plain text. The
  question and the answer are saved for /admin/chats; the X-Chat-Id header names the chat, which
  the reader sends back with the next question.
*/
export async function POST(request: Request) {
  const viewer = await getCurrentUser();
  if (!viewer?.onboardedAt) return Response.json({ error: "sign in" }, { status: 401 });
  if (!aiConfigured()) return Response.json({ error: "not configured" }, { status: 503 });

  const body = await request.json().catch(() => null);
  const postId = body?.postId;
  const messages: unknown = body?.messages;
  if (
    typeof postId !== "string" ||
    !postIdPattern.test(postId) ||
    !Array.isArray(messages) ||
    !messages.every(isMessage) ||
    messages.at(-1)?.role !== "user"
  ) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const [post] = await db
    .select({
      id: posts.id,
      title: posts.title,
      description: posts.description,
      body: posts.body,
      authorName: users.name,
      authorHandle: users.handle,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(and(eq(posts.id, postId), notBanned))
    .limit(1);
  if (!post) return Response.json({ error: "not found" }, { status: 404 });

  const chatId = await openChat(viewer.id, postId, body.chatId);
  await saveMessage(chatId, "user", messages.at(-1)!.text);
  const saveAnswer = (answer: string, failed: boolean) =>
    saveMessage(chatId, "ai", answer, failed).catch((error) => console.error("ask-ai save:", error));

  try {
    const stream = await askAboutPost(post, messages.slice(-maxMessages), request.signal, saveAnswer);
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Chat-Id": chatId },
    });
  } catch (error) {
    await saveAnswer("", true);
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error("ask-ai:", error);
    return Response.json({ error: "upstream" }, { status: 502, headers: { "X-Chat-Id": chatId } });
  }
}

import { eq } from "drizzle-orm";
import { aiConfigured, askAboutPost, maxMessageLength, maxMessages, type ChatMessage } from "@/lib/ask-ai";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
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

// The reading chat: streams the answer to the last question about a post as plain text.
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
    .select({ title: posts.title, description: posts.description, body: posts.body })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!post) return Response.json({ error: "not found" }, { status: 404 });

  try {
    const stream = await askAboutPost(post, messages.slice(-maxMessages), request.signal);
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error("ask-ai:", error);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}

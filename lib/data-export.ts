import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  aiChats,
  aiMessages,
  commentLikes,
  comments,
  follows,
  postFavorites,
  postLikes,
  posts,
  reports,
  users,
  type User,
} from "./db/schema";
import { avatarUrl, imageUrl } from "./user-view";

const author = alias(users, "author");

// Everything the reader put into dawere, as one JSON document for the download in settings.
// `origin` turns the site's own paths into links that work outside it.
export async function buildDataExport(user: User, origin: string) {
  const link = (path: string) => `${origin}${path}`;
  const postLink = (handle: string, id: string) => link(`/@${handle}/${id}`);

  const [
    ownPosts,
    ownComments,
    liked,
    likedComments,
    favorites,
    following,
    followers,
    chats,
    filed,
  ] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        description: posts.description,
        cover: posts.cover,
        tags: posts.tags,
        body: posts.body,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(eq(posts.userId, user.id))
      .orderBy(asc(posts.createdAt)),
    db
      .select({
        body: comments.body,
        createdAt: comments.createdAt,
        postId: posts.id,
        postTitle: posts.title,
        postAuthor: author.handle,
      })
      .from(comments)
      .innerJoin(posts, eq(posts.id, comments.postId))
      .innerJoin(author, eq(author.id, posts.userId))
      .where(and(eq(comments.userId, user.id), isNull(comments.deletedAt)))
      .orderBy(asc(comments.createdAt)),
    db
      .select({ postId: posts.id, title: posts.title, author: author.handle, at: postLikes.createdAt })
      .from(postLikes)
      .innerJoin(posts, eq(posts.id, postLikes.postId))
      .innerJoin(author, eq(author.id, posts.userId))
      .where(eq(postLikes.userId, user.id))
      .orderBy(asc(postLikes.createdAt)),
    db
      .select({ body: comments.body, postId: posts.id, author: author.handle, at: commentLikes.createdAt })
      .from(commentLikes)
      .innerJoin(comments, eq(comments.id, commentLikes.commentId))
      .innerJoin(posts, eq(posts.id, comments.postId))
      .innerJoin(author, eq(author.id, posts.userId))
      .where(eq(commentLikes.userId, user.id))
      .orderBy(asc(commentLikes.createdAt)),
    db
      .select({ postId: posts.id, title: posts.title, author: author.handle, at: postFavorites.createdAt })
      .from(postFavorites)
      .innerJoin(posts, eq(posts.id, postFavorites.postId))
      .innerJoin(author, eq(author.id, posts.userId))
      .where(eq(postFavorites.userId, user.id))
      .orderBy(asc(postFavorites.createdAt)),
    db
      .select({ handle: users.handle, name: users.name, at: follows.createdAt })
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followingId))
      .where(eq(follows.followerId, user.id))
      .orderBy(asc(follows.createdAt)),
    db
      .select({ handle: users.handle, name: users.name, at: follows.createdAt })
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followerId))
      .where(eq(follows.followingId, user.id))
      .orderBy(asc(follows.createdAt)),
    db
      .select({ id: aiChats.id, postId: posts.id, title: posts.title, author: author.handle, at: aiChats.createdAt })
      .from(aiChats)
      .innerJoin(posts, eq(posts.id, aiChats.postId))
      .innerJoin(author, eq(author.id, posts.userId))
      .where(eq(aiChats.userId, user.id))
      .orderBy(asc(aiChats.createdAt)),
    db
      .select({ kind: reports.kind, reason: reports.reason, details: reports.details, at: reports.createdAt })
      .from(reports)
      .where(eq(reports.reporterId, user.id))
      .orderBy(asc(reports.createdAt)),
  ]);

  const messages = chats.length
    ? await db
        .select({ chatId: aiMessages.chatId, role: aiMessages.role, text: aiMessages.text, at: aiMessages.createdAt })
        .from(aiMessages)
        .where(
          inArray(
            aiMessages.chatId,
            chats.map((chat) => chat.id),
          ),
        )
        .orderBy(asc(aiMessages.createdAt))
    : [];

  const avatar = avatarUrl(user.avatar);

  return {
    exportedAt: new Date(),
    profile: {
      email: user.email,
      handle: user.handle,
      name: user.name,
      bio: user.bio,
      avatar: avatar ? link(avatar) : null,
      topics: user.topics ?? [],
      favoritesPublic: user.favoritesPublic,
      theme: user.theme,
      createdAt: user.createdAt,
    },
    posts: ownPosts.map((post) => ({
      url: postLink(user.handle, post.id),
      title: post.title,
      description: post.description,
      cover: post.cover && link(imageUrl(post.cover)),
      tags: post.tags,
      // The editor's own document format, so nothing in it is lost.
      body: post.body,
      createdAt: post.createdAt,
    })),
    comments: ownComments.map((comment) => ({
      post: { url: postLink(comment.postAuthor, comment.postId), title: comment.postTitle },
      body: comment.body,
      createdAt: comment.createdAt,
    })),
    likes: liked.map((like) => ({ url: postLink(like.author, like.postId), title: like.title, likedAt: like.at })),
    commentLikes: likedComments.map((like) => ({
      post: postLink(like.author, like.postId),
      comment: like.body,
      likedAt: like.at,
    })),
    favorites: favorites.map((favorite) => ({
      url: postLink(favorite.author, favorite.postId),
      title: favorite.title,
      savedAt: favorite.at,
    })),
    following: following.map((row) => ({ url: link(`/@${row.handle}`), name: row.name, since: row.at })),
    followers: followers.map((row) => ({ url: link(`/@${row.handle}`), name: row.name, since: row.at })),
    aiChats: chats.map((chat) => ({
      post: { url: postLink(chat.author, chat.postId), title: chat.title },
      startedAt: chat.at,
      messages: messages
        .filter((message) => message.chatId === chat.id)
        .map((message) => ({ role: message.role, text: message.text, at: message.at })),
    })),
    reports: filed.map((report) => ({
      kind: report.kind,
      reason: report.reason,
      details: report.details,
      createdAt: report.at,
    })),
  };
}

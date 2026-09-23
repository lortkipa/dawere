/**
 * Kinds of notification, in the order settings lists them. Kept apart from
 * db/schema.ts so client components can import it without pulling in Drizzle.
 */
export const NOTIFICATION_TYPES = [
  'post_like',
  'comment_like',
  'post_comment',
  'comment_reply',
  'mention',
  'follow',
  'new_post',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

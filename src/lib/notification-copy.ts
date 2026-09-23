import type { NotificationType } from '@/lib/notification-types';

/**
 * Wording for each kind of notification. `action` follows the actor's name,
 * which sits above it as a heading rather than as the grammatical subject:
 * Georgian would want the name in the ergative ("ნიკამ მოიწონა"), and that
 * cannot be formed reliably from an arbitrary display name.
 */
export const NOTIFICATION_COPY: Record<
  NotificationType,
  { action: string; setting: string; hint: string }
> = {
  post_like: {
    action: 'მოიწონა შენი სტატია',
    setting: 'სტატიის მოწონება',
    hint: 'როცა ვინმე შენს სტატიას მოიწონებს.',
  },
  comment_like: {
    action: 'მოიწონა შენი კომენტარი',
    setting: 'კომენტარის მოწონება',
    hint: 'როცა ვინმე შენს კომენტარს მოიწონებს.',
  },
  post_comment: {
    action: 'დაწერა კომენტარი შენს სტატიაზე',
    setting: 'კომენტარები',
    hint: 'როცა ვინმე შენს სტატიას დააკომენტარებს.',
  },
  comment_reply: {
    action: 'გიპასუხა კომენტარზე',
    setting: 'პასუხები',
    hint: 'როცა ვინმე შენს კომენტარს უპასუხებს.',
  },
  mention: {
    action: 'მოგიხსენია კომენტარში',
    setting: 'მოხსენიებები',
    hint: 'როცა ვინმე კომენტარში @მომხმარებლის სახელით მოგიხსენიებს.',
  },
  follow: {
    action: 'გამოგიწერა',
    setting: 'ახალი გამომწერები',
    hint: 'როცა ვინმე გამოგიწერს.',
  },
  new_post: {
    action: 'გამოაქვეყნა ახალი სტატია',
    setting: 'ახალი სტატიები',
    hint: 'როცა ავტორი, რომელიც გამოწერილი გაქვს, ახალ სტატიას გამოაქვეყნებს.',
  },
};

/** What the list and the toasts show for one notification. */
export type NotificationView = {
  id: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  actor: { name: string; username: string; avatarUrl: string | null };
  post: { title: string; slug: string } | null;
  comment: { id: string; excerpt: string } | null;
  href: string;
};

/** One line for a toast: "ნიკა — მოიწონა შენი სტატია „…“". */
export function notificationSummary(item: NotificationView): string {
  const detail = item.post && !item.comment ? ` „${item.post.title}“` : '';
  return `${item.actor.name} — ${NOTIFICATION_COPY[item.type].action}${detail}`;
}

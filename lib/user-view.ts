import type { User } from "./db/schema";

export function avatarUrl(avatar: string | null) {
  return avatar ? `/avatars/${avatar}` : undefined;
}

export function imageUrl(name: string) {
  return `/images/${name}`;
}

// What the header's avatar menu needs to know about the signed-in user.
export function menuUser(user: User) {
  return { name: user.name, email: user.email, handle: user.handle, avatar: user.avatar };
}

const dateFormat = new Intl.DateTimeFormat("ka-GE", { day: "numeric", month: "long", year: "numeric" });

// "4 ოქტომბერი, 2026". Formatted on the server, so the client never renders another day.
export function formatDate(date: Date) {
  return dateFormat.format(date);
}

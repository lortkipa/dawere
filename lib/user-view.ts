import type { User } from "./db/schema";

export function avatarUrl(avatar: string | null) {
  return avatar ? `/avatars/${avatar}` : undefined;
}

// What the header's avatar menu needs to know about the signed-in user.
export function menuUser(user: User) {
  return { name: user.name, email: user.email, handle: user.handle, avatar: user.avatar };
}

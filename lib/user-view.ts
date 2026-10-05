import type { User } from "./db/schema";
import { isAdmin } from "./roles";

export function avatarUrl(avatar: string | null) {
  return avatar ? `/avatars/${avatar}` : undefined;
}

export function imageUrl(name: string) {
  return `/images/${name}`;
}

// What the header's avatar menu needs to know about the signed-in user.
export function menuUser(user: User) {
  return { name: user.name, email: user.email, handle: user.handle, avatar: user.avatar, admin: isAdmin(user) };
}

const dateFormat = new Intl.DateTimeFormat("ka-GE", { day: "numeric", month: "long", year: "numeric" });

// "4 ოქტომბერი, 2026". Formatted on the server, so the client never renders another day.
export function formatDate(date: Date) {
  return dateFormat.format(date);
}

const shortDateFormat = new Intl.DateTimeFormat("ka-GE", { day: "numeric", month: "short", year: "numeric" });

// "4 ოქტ. 2026", for tables.
export function formatShortDate(date: Date) {
  return shortDateFormat.format(date);
}

// The server runs in UTC, so times are pinned to Georgia's clock.
const dateTimeFormat = new Intl.DateTimeFormat("ka-GE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tbilisi",
});

// "5 ოქტომბერი, 2026, 18:44"
export function formatDateTime(date: Date) {
  return dateTimeFormat.format(date);
}

const timeFormat = new Intl.DateTimeFormat("ka-GE", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tbilisi" });

// "18:44"
export function formatTime(date: Date) {
  return timeFormat.format(date);
}

const relativeFormat = new Intl.RelativeTimeFormat("ka", { numeric: "auto" });

const relativeSteps: [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60],
  ["hour", 60 * 60],
  ["day", 60 * 60 * 24],
  ["week", 60 * 60 * 24 * 7],
  ["month", 60 * 60 * 24 * 30],
  ["year", 60 * 60 * 24 * 365],
];

// „4 დღის წინ“. Also formatted on the server, for the same reason as formatDate.
export function formatRelative(date: Date, now = new Date()) {
  const seconds = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "ახლახან";
  let unit = relativeSteps[0];
  for (const step of relativeSteps) if (seconds >= step[1]) unit = step;
  return relativeFormat.format(-Math.floor(seconds / unit[1]), unit[0]);
}

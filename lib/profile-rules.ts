// Validation shared by the settings dialogs and their server actions.

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const minHandleLength = 3;
export const maxHandleLength = 30;
// Characters a URL path carries without percent-encoding (RFC 3986 "unreserved"). Other
// legal ones like `(`, `'` or `!` get cut off when messengers turn a link into a URL.
const handleCharacters = /^[a-z0-9._~-]+$/;
// Shown both by the live check and when saving loses a race.
export const handleTakenError = "ეს სახელი დაკავებულია";

export const maxBioLength = 150;
export const maxAvatarBytes = 5 * 1024 * 1024;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeHandle(handle: string) {
  return handle.trim().toLowerCase();
}

// Expects a normalized handle. All-dot handles would read as `.` or `..` path segments.
export function isValidHandle(handle: string) {
  return (
    handle.length >= minHandleLength &&
    handle.length <= maxHandleLength &&
    handleCharacters.test(handle) &&
    !/^\.+$/.test(handle)
  );
}

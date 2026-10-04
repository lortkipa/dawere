// Limits shared by the editor and the publish action.

export const maxTitleLength = 100;
export const maxDescriptionLength = 200;
// Characters of plain text in the body.
export const maxBodyLength = 100_000;
// Cover included.
export const maxImages = 20;
// What the editor accepts from the user; it shrinks photos before sending them.
export const maxPickedImageBytes = 20 * 1024 * 1024;
// What the publish action accepts per file, after the browser shrank it.
export const maxUploadBytes = 10 * 1024 * 1024;
export const imageTypes = ["image/jpeg", "image/png", "image/webp"];

// Links may only point to web pages or email addresses, so a `javascript:` href never renders.
export function isSafeHref(href: unknown): href is string {
  return typeof href === "string" && /^(https?:\/\/|mailto:)\S+$/i.test(href);
}

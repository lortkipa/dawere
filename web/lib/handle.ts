import { romanise } from "./slug";

/**
 * A person's address is the first segment of the site — `/nikoloz-e722ded8` —
 * and it is not theirs to choose. Both halves are derived: the first word of
 * their name, and the head of their row id. So there is nothing to check for
 * uniqueness, nothing to keep in step with a second column, and the address is
 * recomputable from the row at any time.
 *
 * That derivation is also why the name is checked as strictly as it is below:
 * whatever goes in the field becomes a URL.
 */

/** Longest handle body before the suffix. First names are short; this is slack. */
const MAX_BODY = 30;

/** Enough of the row id to tell two people with one name apart. */
const SUFFIX_LENGTH = 8;

export const MAX_NAME = 60;

/** Latin letters in words, single spaces between them, and nothing else. */
const NAME = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

/**
 * The address for a name and a row id. Deterministic, so changing the name in
 * /settings moves the page and nothing has to be looked up to know where to.
 */
export function handleFor(name: string | null, userId: string): string {
  const firstName = (name ?? "").trim().split(/\s+/)[0] ?? "";
  // Names arriving from OAuth have been through no check of ours, so they can
  // still be in mkhedruli — or in a script romanise leaves nothing of.
  const body = romanise(firstName, MAX_BODY) || "avtori";
  const suffix = userId.replace(/-/g, "").slice(0, SUFFIX_LENGTH);

  return `${body}-${suffix}`;
}

export type NameCheck =
  | { ok: true; name: string }
  | { ok: false; error: string };

/** Validates a name someone typed, and collapses its spacing. */
export function checkName(raw: string): NameCheck {
  const name = raw.trim().replace(/\s+/g, " ");

  if (!name) return { ok: false, error: "სახელი ცარიელი ვერ იქნება." };

  if (name.length > MAX_NAME) {
    return { ok: false, error: `სახელი ${MAX_NAME} სიმბოლოზე გრძელია.` };
  }

  if (!NAME.test(name)) {
    return {
      ok: false,
      error:
        "სახელი მხოლოდ ლათინური ასოებით უნდა დაიწეროს — ციფრების, სიმბოლოებისა და ქართული ასოების გარეშე.",
    };
  }

  return { ok: true, name };
}

// The sign-in code email. Only the part under the code can be changed, on /admin/email; shared by
// lib/sign-in-codes.ts and the preview there.
export const maxCodeEmailFooterLength = 1000;

// How long a code works. The footer says it in words, so a change here needs a new footer too.
export const codeLifetimeMinutes = 10;

export const defaultCodeEmailFooter =
  `კოდი ${codeLifetimeMinutes} წუთი მოქმედებს. თუ შესვლა შენ არ გიცდია, ეს წერილი უბრალოდ დააიგნორე.`;

export const codeEmailSubject = (code: string) => `შესვლის კოდი: ${code}`;

export function codeEmailText(code: string, footer: string) {
  const top = `dawere-ზე შესასვლელად შეიყვანე ეს კოდი:\n\n${code.slice(0, 3)} ${code.slice(3)}`;
  return footer ? `${top}\n\n${footer}` : top;
}

// Trims the text and keeps at most one empty line between paragraphs.
export function cleanCodeEmailFooter(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

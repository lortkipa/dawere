// The two documents everyone agrees to on /auth. Each one's URL is its key.
export const legalDocs = ["terms", "privacy"] as const;
export type LegalDoc = (typeof legalDocs)[number];

export const legalNames: Record<LegalDoc, string> = {
  terms: "გამოყენების წესები",
  privacy: "კონფიდენციალურობის პოლიტიკა",
};

export function isLegalDoc(value: string): value is LegalDoc {
  return (legalDocs as readonly string[]).includes(value);
}

export const maxLegalTitleLength = 100;
// Characters of plain text.
export const maxLegalBodyLength = 100_000;

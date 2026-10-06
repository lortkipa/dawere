// The site's public documents, edited on /admin/legal. Each one's URL is its key. Everyone agrees
// to the terms and the privacy policy on /auth; the help page is only for reading.
export const legalDocs = ["terms", "privacy", "help"] as const;
export type LegalDoc = (typeof legalDocs)[number];

export const legalNames: Record<LegalDoc, string> = {
  terms: "გამოყენების წესები",
  privacy: "კონფიდენციალურობის პოლიტიკა",
  help: "დახმარება",
};

export function isLegalDoc(value: string): value is LegalDoc {
  return (legalDocs as readonly string[]).includes(value);
}

export const maxLegalTitleLength = 100;
// Characters of plain text.
export const maxLegalBodyLength = 100_000;

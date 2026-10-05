export type Option = { slug: string; emoji: string; label: string };

// The topics themselves are categories in the database; see lib/categories.ts.

export const referrals: Option[] = [
  { slug: "google", emoji: "🔍", label: "Google" },
  { slug: "facebook", emoji: "📘", label: "Facebook" },
  { slug: "instagram", emoji: "📸", label: "Instagram" },
  { slug: "tiktok", emoji: "🎵", label: "TikTok" },
  { slug: "youtube", emoji: "▶️", label: "YouTube" },
  { slug: "friend", emoji: "👥", label: "მეგობრისგან" },
  { slug: "other", emoji: "✨", label: "სხვა" },
];

export const minTopics = 3;
export const maxNameLength = 40;
export const maxReferralOtherLength = 100;

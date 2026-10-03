export type Option = { slug: string; emoji: string; label: string };

export const topics: Option[] = [
  { slug: "technology", emoji: "💻", label: "ტექნოლოგიები" },
  { slug: "programming", emoji: "⌨️", label: "პროგრამირება" },
  { slug: "ai", emoji: "🤖", label: "ხელოვნური ინტელექტი" },
  { slug: "science", emoji: "🔬", label: "მეცნიერება" },
  { slug: "business", emoji: "💼", label: "ბიზნესი" },
  { slug: "finance", emoji: "💰", label: "ფინანსები" },
  { slug: "history", emoji: "📜", label: "ისტორია" },
  { slug: "politics", emoji: "🏛️", label: "პოლიტიკა" },
  { slug: "culture", emoji: "🎭", label: "კულტურა" },
  { slug: "literature", emoji: "📚", label: "ლიტერატურა" },
  { slug: "cinema", emoji: "🎬", label: "კინო" },
  { slug: "music", emoji: "🎵", label: "მუსიკა" },
  { slug: "art", emoji: "🎨", label: "ხელოვნება" },
  { slug: "travel", emoji: "✈️", label: "მოგზაურობა" },
  { slug: "food", emoji: "🍲", label: "კულინარია" },
  { slug: "sport", emoji: "⚽", label: "სპორტი" },
  { slug: "health", emoji: "🩺", label: "ჯანმრთელობა" },
  { slug: "psychology", emoji: "🧠", label: "ფსიქოლოგია" },
  { slug: "education", emoji: "🎓", label: "განათლება" },
  { slug: "gaming", emoji: "🎮", label: "თამაშები" },
  { slug: "nature", emoji: "🌿", label: "ბუნება" },
];

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

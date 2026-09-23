/**
 * A glyph per topic, used on the landing page and the onboarding picker.
 *
 * Emoji rather than an icon set: topics are seeded content, not code, so a new
 * topic must not require a new import. Slugs are stable ASCII (see db/schema.sql),
 * and anything unmapped falls back to a deterministic pick so the same topic
 * always wears the same face.
 */
const TOPIC_EMOJI: Record<string, string> = {
  engineering: '⚙️',
  design: '🎨',
  product: '🧩',
  ai: '🤖',
  startups: '🚀',
  career: '🧭',
  writing: '✍️',
  science: '🔬',
  health: '🌿',
  finance: '📈',
  travel: '🧳',
  food: '🍜',
  databases: '🗄️',
  css: '🎛️',
  typescript: '🔤',
  photography: '📷',
  music: '🎧',
  history: '🏛️',
  sports: '🏃',
  education: '📚',
  politics: '🗳️',
  culture: '🎭',
  books: '📖',
  cinema: '🎬',
  nature: '🌍',
  games: '🎮',
};

const FALLBACK = ['📝', '💡', '🔖', '🧠', '🪄', '📎', '🗞️', '🧵'];

export function topicEmoji(slug: string): string {
  const mapped = TOPIC_EMOJI[slug];
  if (mapped) return mapped;
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) % 997;
  return FALLBACK[hash % FALLBACK.length];
}

/**
 * Hues for the generated covers. Known topics are placed by hand so the seeded
 * set spreads around the wheel; anything else hashes into the same well-spaced
 * list rather than the full circle, where short slugs clustered in the pinks.
 */
const TOPIC_HUES = [168, 205, 232, 262, 292, 338, 18, 38, 88, 128];

const TOPIC_HUE: Record<string, number> = {
  engineering: 232,
  design: 338,
  product: 168,
  ai: 262,
  startups: 18,
  career: 205,
  writing: 38,
  science: 292,
  health: 128,
  finance: 88,
  travel: 205,
  food: 18,
  databases: 168,
  css: 292,
  typescript: 232,
  photography: 38,
  books: 338,
  culture: 292,
  history: 38,
  cinema: 262,
  music: 205,
  sports: 128,
  education: 88,
};

export function topicHue(slug: string): number {
  const mapped = TOPIC_HUE[slug];
  if (mapped !== undefined) return mapped;
  // FNV-1a with a final avalanche, so similar slugs still land far apart.
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0x5bd1e995);
  hash ^= hash >>> 15;
  return TOPIC_HUES[(hash >>> 0) % TOPIC_HUES.length];
}

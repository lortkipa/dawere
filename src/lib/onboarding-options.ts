/**
 * The answers offered during sign-up onboarding. Plain data, imported by both the
 * client wizard and the server action that validates what came back.
 */

export const DISCOVERY_OPTIONS = [
  { key: 'friend', emoji: '👋', label: 'მეგობრისგან' },
  { key: 'facebook', emoji: '📘', label: 'ფეისბუქი' },
  { key: 'instagram', emoji: '📸', label: 'ინსტაგრამი' },
  { key: 'twitter', emoji: '🐦', label: 'X (Twitter)' },
  { key: 'telegram', emoji: '✈️', label: 'ტელეგრამი' },
  { key: 'youtube', emoji: '▶️', label: 'იუთუბი' },
  { key: 'tiktok', emoji: '🎵', label: 'ტიკტოკი' },
  { key: 'google', emoji: '🔍', label: 'გუგლის ძიება' },
  { key: 'linkedin', emoji: '💼', label: 'ლინკედინი' },
  { key: 'link', emoji: '🔗', label: 'სტატიის ბმულით' },
  { key: 'event', emoji: '🎤', label: 'ლექცია ან ღონისძიება' },
  { key: 'other', emoji: '✏️', label: 'სხვა' },
] as const;

export const ROLE_OPTIONS = [
  { key: 'reader', emoji: '📖', label: 'მკითხველი', hint: 'ძირითადად ვკითხულობ.' },
  { key: 'writer', emoji: '✍️', label: 'ავტორი', hint: 'მოვედი, რომ ვწერო.' },
  { key: 'both', emoji: '🪄', label: 'ორივე', hint: 'ვკითხულობ და ვწერ კიდეც.' },
] as const;

export const DISCOVERY_KEYS: readonly string[] = DISCOVERY_OPTIONS.map((o) => o.key);
export const ROLE_KEYS: readonly string[] = ROLE_OPTIONS.map((o) => o.key);

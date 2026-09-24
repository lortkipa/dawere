/**
 * The answers offered during sign-up onboarding. Plain data, imported by both the
 * client wizard and the server action that validates what came back.
 */

export const DISCOVERY_OPTIONS = [
  { key: 'friend', label: 'მეგობრისგან' },
  { key: 'facebook', label: 'ფეისბუქი' },
  { key: 'instagram', label: 'ინსტაგრამი' },
  { key: 'twitter', label: 'X (Twitter)' },
  { key: 'telegram', label: 'ტელეგრამი' },
  { key: 'youtube', label: 'იუთუბი' },
  { key: 'tiktok', label: 'ტიკტოკი' },
  { key: 'google', label: 'გუგლის ძიება' },
  { key: 'linkedin', label: 'ლინკედინი' },
  { key: 'link', label: 'სტატიის ბმულით' },
  { key: 'event', label: 'ლექცია ან ღონისძიება' },
  { key: 'other', label: 'სხვა' },
] as const;

export const ROLE_OPTIONS = [
  { key: 'reader', label: 'მკითხველი', hint: 'ძირითადად ვკითხულობ.' },
  { key: 'writer', label: 'ავტორი', hint: 'მოვედი, რომ ვწერო.' },
  { key: 'both', label: 'ორივე', hint: 'ვკითხულობ და ვწერ კიდეც.' },
] as const;

export const DISCOVERY_KEYS: readonly string[] = DISCOVERY_OPTIONS.map((o) => o.key);
export const ROLE_KEYS: readonly string[] = ROLE_OPTIONS.map((o) => o.key);

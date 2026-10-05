CREATE TABLE "categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"emoji" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- The topics that used to live in lib/onboarding-options.ts.
INSERT INTO "categories" ("slug", "label", "emoji", "position") VALUES
  ('technology', 'ტექნოლოგიები', '💻', 0),
  ('programming', 'პროგრამირება', '⌨️', 1),
  ('ai', 'ხელოვნური ინტელექტი', '🤖', 2),
  ('science', 'მეცნიერება', '🔬', 3),
  ('business', 'ბიზნესი', '💼', 4),
  ('finance', 'ფინანსები', '💰', 5),
  ('history', 'ისტორია', '📜', 6),
  ('politics', 'პოლიტიკა', '🏛️', 7),
  ('culture', 'კულტურა', '🎭', 8),
  ('literature', 'ლიტერატურა', '📚', 9),
  ('cinema', 'კინო', '🎬', 10),
  ('music', 'მუსიკა', '🎵', 11),
  ('art', 'ხელოვნება', '🎨', 12),
  ('travel', 'მოგზაურობა', '✈️', 13),
  ('food', 'კულინარია', '🍲', 14),
  ('sport', 'სპორტი', '⚽', 15),
  ('health', 'ჯანმრთელობა', '🩺', 16),
  ('psychology', 'ფსიქოლოგია', '🧠', 17),
  ('education', 'განათლება', '🎓', 18),
  ('gaming', 'თამაშები', '🎮', 19),
  ('nature', 'ბუნება', '🌿', 20);

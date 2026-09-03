ALTER TABLE "users" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text DEFAULT '' NOT NULL;--> statement-breakpoint
-- Backfill: what lib/handle.ts would have minted for these rows had it existed
-- when they were created — the first name, or the local part of the email when
-- the name romanises to nothing, plus eight hex. The suffix comes from the row's
-- own id rather than from random(), so it is unique without a lookup.
UPDATE "users" SET "handle" =
  coalesce(
    nullif(trim(both '-' from left(regexp_replace(lower(split_part(coalesce("name", ''), ' ', 1)), '[^a-z0-9]+', '-', 'g'), 30)), ''),
    nullif(trim(both '-' from left(regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9]+', '-', 'g'), 30)), ''),
    'avtori'
  ) || '-' || substr(replace("id", '-', ''), 1, 8);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "handle" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_handle_unique" UNIQUE("handle");

ALTER TABLE "users" ADD COLUMN "handle" text DEFAULT substr(md5(random()::text), 1, 10) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_handle_unique" UNIQUE("handle");
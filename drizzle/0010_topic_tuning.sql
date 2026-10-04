ALTER TABLE "users" ADD COLUMN "topics_edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "topics_tuned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dismissed_topics" text[] DEFAULT '{}' NOT NULL;
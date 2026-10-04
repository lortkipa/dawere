ALTER TABLE "posts" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE INDEX "posts_tags_index" ON "posts" USING gin ("tags");
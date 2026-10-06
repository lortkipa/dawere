CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "posts_title_trgm_index" ON "posts" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "posts_description_trgm_index" ON "posts" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "users_name_trgm_index" ON "users" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "users_handle_trgm_index" ON "users" USING gin ("handle" gin_trgm_ops);
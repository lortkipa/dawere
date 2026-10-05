CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"kind" text NOT NULL,
	"post_id" text,
	"comment_id" uuid,
	"user_id" uuid,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_one_target" CHECK (("reports"."kind" = 'post' and "reports"."post_id" is not null and "reports"."comment_id" is null and "reports"."user_id" is null)
        or ("reports"."kind" = 'comment' and "reports"."comment_id" is not null and "reports"."post_id" is null and "reports"."user_id" is null)
        or ("reports"."kind" = 'user' and "reports"."user_id" is not null and "reports"."post_id" is null and "reports"."comment_id" is null))
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_status_created_at_index" ON "reports" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reports_post_id_index" ON "reports" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "reports_comment_id_index" ON "reports" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "reports_user_id_index" ON "reports" USING btree ("user_id");
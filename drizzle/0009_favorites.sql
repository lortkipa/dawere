CREATE TABLE "post_favorites" (
	"user_id" uuid NOT NULL,
	"post_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_favorites_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "favorites_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "post_favorites" ADD CONSTRAINT "post_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_favorites" ADD CONSTRAINT "post_favorites_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_favorites_user_id_created_at_index" ON "post_favorites" USING btree ("user_id","created_at" DESC NULLS LAST);
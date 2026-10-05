CREATE TABLE "bans" (
	"email" text PRIMARY KEY NOT NULL,
	"reason" text,
	"banned_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bans" ADD CONSTRAINT "bans_banned_by_users_id_fk" FOREIGN KEY ("banned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
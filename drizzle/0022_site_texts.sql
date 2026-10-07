CREATE TABLE "site_texts" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"editor_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_texts" ADD CONSTRAINT "site_texts_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
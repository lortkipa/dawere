CREATE TABLE "legal_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc" text NOT NULL,
	"title" text NOT NULL,
	"body" jsonb NOT NULL,
	"editor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legal_versions" ADD CONSTRAINT "legal_versions_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "legal_versions_doc_created_at_index" ON "legal_versions" USING btree ("doc","created_at" DESC NULLS LAST);
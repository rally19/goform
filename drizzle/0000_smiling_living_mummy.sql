CREATE TYPE "public"."field_type" AS ENUM('short_text', 'long_text', 'number', 'email', 'phone', 'url', 'date', 'time', 'datetime', 'select', 'multi_select', 'checkbox', 'radio', 'rating', 'scale', 'file', 'section', 'page_break');--> statement-breakpoint
CREATE TYPE "public"."form_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"type" "field_type" NOT NULL,
	"label" text DEFAULT 'Untitled Question' NOT NULL,
	"description" text,
	"placeholder" text,
	"required" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"options" jsonb,
	"validation" jsonb,
	"properties" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"respondent_id" varchar,
	"respondent_email" text,
	"answers" jsonb NOT NULL,
	"metadata" jsonb,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text DEFAULT 'Untitled Form' NOT NULL,
	"description" text,
	"slug" varchar(100) NOT NULL,
	"status" "form_status" DEFAULT 'draft' NOT NULL,
	"accent_color" varchar(7) DEFAULT '#6366f1' NOT NULL,
	"accept_responses" boolean DEFAULT true NOT NULL,
	"require_auth" boolean DEFAULT false NOT NULL,
	"show_progress" boolean DEFAULT true NOT NULL,
	"one_response_per_user" boolean DEFAULT false NOT NULL,
	"success_message" text DEFAULT 'Thank you for your response!' NOT NULL,
	"redirect_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "forms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_fields_form_id_idx" ON "form_fields" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_fields_order_idx" ON "form_fields" USING btree ("form_id","order_index");--> statement-breakpoint
CREATE INDEX "form_responses_form_id_idx" ON "form_responses" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_responses_submitted_at_idx" ON "form_responses" USING btree ("form_id","submitted_at");--> statement-breakpoint
CREATE INDEX "forms_user_id_idx" ON "forms" USING btree ("user_id");
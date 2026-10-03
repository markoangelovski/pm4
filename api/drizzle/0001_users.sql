CREATE TYPE "public"."auth_provider" AS ENUM('google');--> statement-breakpoint
CREATE TABLE "user_identities" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"subject" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "user_identities_provider_subject_pk" PRIMARY KEY("provider","subject")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" varchar(254) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"avatar_url" varchar(500),
	"time_zone" varchar(64) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_identities_user_id_idx" ON "user_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_key" ON "users" USING btree (lower("email"));
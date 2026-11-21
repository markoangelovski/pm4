CREATE TYPE "public"."oauth_scope" AS ENUM('read', 'write');--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"client_name" varchar(100) NOT NULL,
	"redirect_uris" varchar(2000)[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_grants" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scope" "oauth_scope" NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" varchar(2048) NOT NULL,
	"client_name" varchar(100) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_grants" ADD CONSTRAINT "oauth_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_grants_user_client_uq" ON "oauth_grants" USING btree ("user_id","client_id");
ALTER TABLE "oauth_clients" ADD COLUMN "logo_uri" varchar(2048);--> statement-breakpoint
ALTER TABLE "oauth_grants" ADD COLUMN "logo_uri" varchar(2048);
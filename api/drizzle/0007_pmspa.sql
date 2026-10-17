CREATE TYPE "public"."pmspa_link_origin" AS ENUM('imported', 'pushed', 'linked');--> statement-breakpoint
CREATE TYPE "public"."pmspa_status" AS ENUM('connected', 'invalid-credentials', 'unreachable');--> statement-breakpoint
CREATE TABLE "pmspa_connections" (
	"last_checked_at" timestamp with time zone NOT NULL,
	"last_sync_at" timestamp with time zone,
	"status" "pmspa_status" NOT NULL,
	"user_id" uuid PRIMARY KEY NOT NULL,
	"pmspa_user_id" "bytea",
	"url" varchar(500) NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_enc" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pmspa_log_links" (
	"synced_at" timestamp with time zone NOT NULL,
	"origin" "pmspa_link_origin" NOT NULL,
	"time_log_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"pmspa_user_id" "bytea" NOT NULL,
	"pmspa_id" "bytea" NOT NULL,
	"pm4_hash" "bytea" NOT NULL,
	"pmspa_hash" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pmspa_project_links" (
	"synced_at" timestamp with time zone NOT NULL,
	"origin" "pmspa_link_origin" NOT NULL,
	"project_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"pmspa_user_id" "bytea" NOT NULL,
	"pmspa_id" "bytea" NOT NULL,
	"pm4_hash" "bytea" NOT NULL,
	"pmspa_hash" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pmspa_task_links" (
	"synced_at" timestamp with time zone NOT NULL,
	"origin" "pmspa_link_origin" NOT NULL,
	"task_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"pmspa_user_id" "bytea" NOT NULL,
	"pmspa_id" "bytea" NOT NULL,
	"pm4_hash" "bytea" NOT NULL,
	"pmspa_hash" "bytea" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pmspa_connections" ADD CONSTRAINT "pmspa_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pmspa_log_links" ADD CONSTRAINT "pmspa_log_links_time_log_id_time_logs_id_fk" FOREIGN KEY ("time_log_id") REFERENCES "public"."time_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pmspa_log_links" ADD CONSTRAINT "pmspa_log_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pmspa_project_links" ADD CONSTRAINT "pmspa_project_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pmspa_project_links" ADD CONSTRAINT "pmspa_project_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pmspa_task_links" ADD CONSTRAINT "pmspa_task_links_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pmspa_task_links" ADD CONSTRAINT "pmspa_task_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pmspa_log_links_pmspa" ON "pmspa_log_links" USING btree ("user_id","pmspa_user_id","pmspa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pmspa_project_links_pmspa" ON "pmspa_project_links" USING btree ("user_id","pmspa_user_id","pmspa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pmspa_task_links_pmspa" ON "pmspa_task_links" USING btree ("user_id","pmspa_user_id","pmspa_id");
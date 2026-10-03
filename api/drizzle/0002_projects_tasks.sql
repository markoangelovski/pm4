CREATE TYPE "public"."task_status" AS ENUM('upcoming', 'in-progress', 'completed');--> statement-breakpoint
CREATE TABLE "projects" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_lead_user_id" uuid,
	"title" varchar(200) NOT NULL,
	"description" varchar(2000),
	"external_link" varchar(500),
	"project_lead" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"due_date" date,
	"status" "task_status" DEFAULT 'upcoming' NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"project_lead_user_id" uuid,
	"title" varchar(200) NOT NULL,
	"description" varchar(2000),
	"external_link" varchar(500),
	"project_lead" varchar(100)
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_lead_user_id_users_id_fk" FOREIGN KEY ("project_lead_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_lead_user_id_users_id_fk" FOREIGN KEY ("project_lead_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_user_id_active_idx" ON "projects" USING btree ("user_id") WHERE "projects"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "projects_user_id_deleted_idx" ON "projects" USING btree ("user_id","deleted_at") WHERE "projects"."deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "tasks_project_id_active_idx" ON "tasks" USING btree ("project_id") WHERE "tasks"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "tasks_user_id_status_active_idx" ON "tasks" USING btree ("user_id","status") WHERE "tasks"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "tasks_user_id_deleted_idx" ON "tasks" USING btree ("user_id","deleted_at") WHERE "tasks"."deleted_at" IS NOT NULL;
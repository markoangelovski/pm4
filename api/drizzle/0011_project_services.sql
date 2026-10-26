CREATE TABLE "project_services" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "service_id" uuid;--> statement-breakpoint
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_services_project_name" ON "project_services" USING btree ("project_id",lower("name"));--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_service_id_project_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."project_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_service_id_idx" ON "tasks" USING btree ("service_id") WHERE "tasks"."service_id" IS NOT NULL;
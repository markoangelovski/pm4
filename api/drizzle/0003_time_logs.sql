CREATE TABLE "time_logs" (
	"work_date" date NOT NULL,
	"duration_minutes" smallint NOT NULL,
	"exclude_from_stats" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid,
	"project_id" uuid,
	"text" varchar(1000) NOT NULL,
	"title" varchar(100),
	"deleted_task_title" varchar(200),
	"deleted_project_title" varchar(200),
	CONSTRAINT "time_logs_duration" CHECK ("time_logs"."duration_minutes" BETWEEN 15 AND 1440 AND "time_logs"."duration_minutes" % 15 = 0)
);
--> statement-breakpoint
CREATE TABLE "workdays" (
	"work_date" date NOT NULL,
	"start_minute" smallint NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "workdays_user_id_work_date_pk" PRIMARY KEY("user_id","work_date"),
	CONSTRAINT "workdays_start_minute" CHECK ("workdays"."start_minute" BETWEEN 0 AND 1425 AND "workdays"."start_minute" % 15 = 0)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "daily_target_minutes" smallint DEFAULT 420 NOT NULL;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workdays" ADD CONSTRAINT "workdays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time_logs_user_date" ON "time_logs" USING btree ("user_id","work_date","id");--> statement-breakpoint
CREATE INDEX "time_logs_task" ON "time_logs" USING btree ("task_id") WHERE "time_logs"."task_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "time_logs_project" ON "time_logs" USING btree ("project_id") WHERE "time_logs"."project_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_daily_target_minutes" CHECK ("users"."daily_target_minutes" BETWEEN 15 AND 1440 AND "users"."daily_target_minutes" % 15 = 0);
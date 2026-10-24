CREATE TABLE "notes" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"task_id" uuid,
	"title" varchar(200),
	"body" varchar(10000) NOT NULL,
	"deleted_project_title" varchar(200),
	"deleted_task_title" varchar(200)
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"task_id" uuid,
	"text" varchar(500) NOT NULL,
	"deleted_project_title" varchar(200),
	"deleted_task_title" varchar(200)
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_user_updated" ON "notes" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "notes_project" ON "notes" USING btree ("project_id") WHERE "notes"."project_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "notes_task" ON "notes" USING btree ("task_id") WHERE "notes"."task_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "todos_user" ON "todos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "todos_project" ON "todos" USING btree ("project_id") WHERE "todos"."project_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "todos_task" ON "todos" USING btree ("task_id") WHERE "todos"."task_id" IS NOT NULL;
UPDATE "time_logs" SET "deleted_task_title" = t."title" FROM "tasks" t JOIN "projects" p ON p."id" = t."project_id" WHERE "time_logs"."task_id" = t."id" AND (t."deleted_at" IS NOT NULL OR p."deleted_at" IS NOT NULL);--> statement-breakpoint
UPDATE "time_logs" SET "deleted_project_title" = p."title" FROM "projects" p WHERE "time_logs"."project_id" = p."id" AND p."deleted_at" IS NOT NULL;--> statement-breakpoint
DELETE FROM "tasks" WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
DELETE FROM "projects" WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
DROP INDEX "projects_user_id_active_idx";--> statement-breakpoint
DROP INDEX "projects_user_id_deleted_idx";--> statement-breakpoint
DROP INDEX "tasks_project_id_active_idx";--> statement-breakpoint
DROP INDEX "tasks_user_id_status_active_idx";--> statement-breakpoint
DROP INDEX "tasks_user_id_deleted_idx";--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_project_id_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_user_id_status_idx" ON "tasks" USING btree ("user_id","status");
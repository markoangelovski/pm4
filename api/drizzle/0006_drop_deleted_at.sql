UPDATE "time_logs" SET "deleted_task_title" = t."title" FROM "tasks" t JOIN "projects" p ON p."id" = t."project_id" WHERE "time_logs"."task_id" = t."id" AND (t."deleted_at" IS NOT NULL OR p."deleted_at" IS NOT NULL);--> statement-breakpoint
UPDATE "time_logs" SET "deleted_project_title" = p."title" FROM "projects" p WHERE "time_logs"."project_id" = p."id" AND p."deleted_at" IS NOT NULL;--> statement-breakpoint
DELETE FROM "tasks" WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
DELETE FROM "projects" WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "deleted_at";
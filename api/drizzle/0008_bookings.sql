CREATE TABLE "bookings" (
	"booking_date" date NOT NULL,
	"minutes" smallint NOT NULL,
	"time_log_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "bookings_time_log_id_booking_date_pk" PRIMARY KEY("time_log_id","booking_date"),
	CONSTRAINT "bookings_minutes" CHECK ("bookings"."minutes" BETWEEN 15 AND 1440 AND "bookings"."minutes" % 15 = 0)
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_time_log_id_time_logs_id_fk" FOREIGN KEY ("time_log_id") REFERENCES "public"."time_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_user_date" ON "bookings" USING btree ("user_id","booking_date");
--> statement-breakpoint
INSERT INTO "bookings" ("booking_date", "minutes", "time_log_id", "user_id")
  SELECT "booking_date", "duration_minutes", "id", "user_id" FROM "time_logs"
  WHERE "booking_date" IS NOT NULL AND NOT "exclude_from_stats" AND ("project_id" IS NOT NULL OR "deleted_project_title" IS NOT NULL);

CREATE TABLE IF NOT EXISTS "image_generation_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"worker_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "image_generation_jobs"
	ADD COLUMN IF NOT EXISTS "payload" jsonb;
--> statement-breakpoint
UPDATE "image_generation_jobs"
	SET "payload" = '{}'::jsonb
	WHERE "payload" IS NULL;
--> statement-breakpoint
ALTER TABLE "image_generation_jobs"
	ALTER COLUMN "payload" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "posts"
	ADD COLUMN IF NOT EXISTS "generation_job_id" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "posts_generation_job_id_unique"
	ON "posts" ("generation_job_id");
-- The Instagram schema is already present in the Drizzle snapshot, but some
-- databases were created without the table from the initial migration, while
-- others still use the legacy column names.
CREATE TABLE IF NOT EXISTS "instagram_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"ig_user_id" text NOT NULL,
	"instagram_handle" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instagram_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'instagram_connections'
			AND column_name = 'instagram_user_id'
	) AND NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'instagram_connections'
			AND column_name = 'ig_user_id'
	) THEN
		ALTER TABLE "instagram_connections"
			RENAME COLUMN "instagram_user_id" TO "ig_user_id";
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'instagram_connections'
			AND column_name = 'handle'
	) AND NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'instagram_connections'
			AND column_name = 'instagram_handle'
	) THEN
		ALTER TABLE "instagram_connections"
			RENAME COLUMN "handle" TO "instagram_handle";
	END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "instagram_connections"
	ADD COLUMN IF NOT EXISTS "ig_user_id" text;
--> statement-breakpoint
ALTER TABLE "instagram_connections"
	ADD COLUMN IF NOT EXISTS "instagram_handle" text;
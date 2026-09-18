-- Migration: drop NOT NULL constraint on posts.image_url
-- Reason: SMS and Email post types do not produce an image, so image_url must be nullable.
-- The Drizzle schema already defines this column as nullable; this migration brings
-- any existing database (created before the schema was corrected) into alignment.

ALTER TABLE "posts" ALTER COLUMN "image_url" DROP NOT NULL;

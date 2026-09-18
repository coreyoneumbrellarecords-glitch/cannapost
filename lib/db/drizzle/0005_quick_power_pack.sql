ALTER TABLE "brand_profiles" ADD COLUMN "primary_color" text;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "secondary_color" text;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "accent_color" text;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "background_color" text;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "layout_grid" text;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "visual_motif" text;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "tone_of_voice" text;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "visual_fingerprint" text;--> statement-breakpoint
UPDATE "brand_profiles"
SET "visual_fingerprint" = left(md5(concat_ws('|',
  upper(coalesce("business_name", '')),
  upper(coalesce("primary_color", '')),
  upper(coalesce("secondary_color", '')),
  upper(coalesce("accent_color", '')),
  upper(coalesce("background_color", '')),
  upper(coalesce("font_style", '')),
  upper(coalesce("layout_grid", '')),
  upper(coalesce("visual_motif", '')),
  upper(coalesce("tone_of_voice", ''))
)), 24)
WHERE "visual_fingerprint" IS NULL;
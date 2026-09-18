CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"caption" text NOT NULL,
	"hashtags" text,
	"image_url" text,
	"prompt" text,
	"platform" text DEFAULT 'instagram' NOT NULL,
	"post_type" text DEFAULT 'post' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp,
	"posted_at" timestamp,
	"instagram_post_id" text,
	"strain_name" text,
	"product_type" text,
	"thc_percentage" text,
	"agco_compliant" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"business_name" text NOT NULL,
	"industry" text NOT NULL,
	"instagram_handle" text,
	"location" text,
	"timezone" text,
	"logo_url" text,
	"logo_base64" text,
	"watermark_position" text DEFAULT 'bottom_right',
	"show_name_watermark" boolean DEFAULT true,
	"brand_colors" text,
	"font_style" text,
	"brand_voice" text,
	"target_audience" text,
	"competitor_handles" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brand_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"frequency" text NOT NULL,
	"preferred_times" text,
	"timezone" text,
	"auto_post" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "schedules_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "instagram_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"ig_user_id" text NOT NULL,
	"instagram_handle" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instagram_connections_user_id_unique" UNIQUE("user_id")
);

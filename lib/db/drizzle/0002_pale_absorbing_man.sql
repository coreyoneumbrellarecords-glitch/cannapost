CREATE TABLE "channel_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"sms_account_sid" text,
	"sms_auth_token" text,
	"sms_sender_phone" text,
	"sms_agco_footer" boolean DEFAULT true NOT NULL,
	"email_sendgrid_api_key" text,
	"email_sender_email" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channel_settings_user_id_unique" UNIQUE("user_id")
);

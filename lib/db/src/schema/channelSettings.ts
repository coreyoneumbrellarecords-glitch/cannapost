import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const channelSettingsTable = pgTable("channel_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  // SMS / Twilio
  smsAccountSid: text("sms_account_sid"),
  // AES-256-GCM ciphertext; encrypted/decrypted only by the API server.
  smsAuthToken: text("sms_auth_token"),
  smsSenderPhone: text("sms_sender_phone"),
  smsAgcoFooter: boolean("sms_agco_footer").default(true).notNull(),
  // Email / SendGrid
  // AES-256-GCM ciphertext; encrypted/decrypted only by the API server.
  emailSendgridApiKey: text("email_sendgrid_api_key"),
  emailSenderEmail: text("email_sender_email"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChannelSettingsSchema = createInsertSchema(channelSettingsTable).omit({
  id: true,
  updatedAt: true,
});

export const updateChannelSettingsSchema = insertChannelSettingsSchema.partial().omit({ userId: true });

export type InsertChannelSettings = z.infer<typeof insertChannelSettingsSchema>;
export type ChannelSettings = typeof channelSettingsTable.$inferSelect;

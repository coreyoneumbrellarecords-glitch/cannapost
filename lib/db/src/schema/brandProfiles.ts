import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brandProfilesTable = pgTable("brand_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  businessName: text("business_name").notNull(),
  industry: text("industry").notNull(),
  instagramHandle: text("instagram_handle"),
  location: text("location"),
  timezone: text("timezone"),
  logoUrl: text("logo_url"),
  logoBase64: text("logo_base64"),
  watermarkPosition: text("watermark_position").default("bottom_right"),
  showNameWatermark: boolean("show_name_watermark").default(true),
  brandColors: text("brand_colors"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  accentColor: text("accent_color"),
  backgroundColor: text("background_color"),
  fontStyle: text("font_style"),
  brandVoice: text("brand_voice"),
  layoutGrid: text("layout_grid"),
  visualMotif: text("visual_motif"),
  toneOfVoice: text("tone_of_voice"),
  visualFingerprint: text("visual_fingerprint"),
  targetAudience: text("target_audience"),
  competitorHandles: text("competitor_handles"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBrandProfileSchema = createInsertSchema(brandProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBrandProfileSchema = insertBrandProfileSchema.partial().omit({ userId: true });

export type InsertBrandProfile = z.infer<typeof insertBrandProfileSchema>;
export type BrandProfile = typeof brandProfilesTable.$inferSelect;

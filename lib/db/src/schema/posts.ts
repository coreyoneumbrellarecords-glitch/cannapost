import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const postsTable = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  generationJobId: uuid("generation_job_id").unique(),
  caption: text("caption").notNull(),
  hashtags: text("hashtags"),
  imageUrl: text("image_url"),
  prompt: text("prompt"),
  platform: text("platform").default("instagram").notNull(),
  postType: text("post_type").default("post").notNull(),
  status: text("status").default("draft").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  postedAt: timestamp("posted_at"),
  instagramPostId: text("instagram_post_id"),
  // Cannabis-specific columns
  strainName: text("strain_name"),
  productType: text("product_type"),
  thcPercentage: text("thc_percentage"),
  agcoCompliant: boolean("agco_compliant").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;

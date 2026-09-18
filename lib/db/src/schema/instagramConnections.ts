import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const instagramConnectionsTable = pgTable("instagram_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  igUserId: text("ig_user_id").notNull(),
  instagramHandle: text("instagram_handle"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInstagramConnectionSchema = createInsertSchema(instagramConnectionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInstagramConnection = z.infer<typeof insertInstagramConnectionSchema>;
export type InstagramConnection = typeof instagramConnectionsTable.$inferSelect;

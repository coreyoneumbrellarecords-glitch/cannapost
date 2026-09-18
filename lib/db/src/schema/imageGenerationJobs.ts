import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const imageGenerationJobsTable = pgTable("image_generation_jobs", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").notNull(),
  workerId: uuid("worker_id").notNull(),
  status: text("status").default("pending").notNull(),
  payload: jsonb("payload").notNull(),
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertImageGenerationJobSchema = createInsertSchema(imageGenerationJobsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertImageGenerationJob = z.infer<typeof insertImageGenerationJobSchema>;
export type ImageGenerationJob = typeof imageGenerationJobsTable.$inferSelect;
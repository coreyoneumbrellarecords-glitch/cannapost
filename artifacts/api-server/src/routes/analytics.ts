import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable } from "@workspace/db";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import {
  GetAnalyticsSummaryResponse,
  GetContentCalendarResponse,
} from "@workspace/api-zod";
import { normalizeApiIds } from "../lib/apiResponse";

const router = Router();

router.get("/analytics/summary", requireAuth, async (req, res) => {
  const userId = getUserId(req);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [allPosts, recentPosts] = await Promise.all([
    db.select().from(postsTable).where(eq(postsTable.userId, userId)),
    db
      .select()
      .from(postsTable)
      .where(eq(postsTable.userId, userId))
      .orderBy(desc(postsTable.createdAt))
      .limit(5),
  ]);

  const totalPosts = allPosts.length;
  const publishedPosts = allPosts.filter(
    (p) => p.status === "published",
  ).length;
  const scheduledPosts = allPosts.filter(
    (p) => p.status === "scheduled",
  ).length;
  const draftPosts = allPosts.filter((p) => p.status === "draft").length;
  const thisWeekPosts = allPosts.filter(
    (p) => new Date(p.createdAt) >= weekAgo,
  ).length;

  const estimatedReach = publishedPosts * 450 + scheduledPosts * 200;

  res.json(
    GetAnalyticsSummaryResponse.parse(normalizeApiIds({
      totalPosts,
      publishedPosts,
      scheduledPosts,
      draftPosts,
      estimatedReach,
      thisWeekPosts,
      recentPosts,
    })),
  );
});

router.get("/analytics/calendar", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const conditions = [eq(postsTable.userId, userId)];
  if (from) conditions.push(gte(postsTable.scheduledAt, new Date(from)));
  if (to) conditions.push(lte(postsTable.scheduledAt, new Date(to)));

  const posts = await db
    .select()
    .from(postsTable)
    .where(and(...conditions))
    .orderBy(postsTable.scheduledAt);

  const entries = posts
    .filter((p) => p.scheduledAt)
    .map((p) => ({
      id: p.id,
      scheduledAt: p.scheduledAt!.toISOString(),
      postType: p.postType,
      status: p.status,
      caption: p.caption ? p.caption.slice(0, 100) : null,
      imageUrl: p.imageUrl,
    }));

  res.json(GetContentCalendarResponse.parse(normalizeApiIds({ entries })));
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { instagramConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import { ConnectInstagramBody } from "@workspace/api-zod";

const router = Router();

router.post("/instagram/connect", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const parsed = ConnectInstagramBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(instagramConnectionsTable)
    .where(eq(instagramConnectionsTable.userId, userId))
    .limit(1);

  if (existing.length) {
    const [updated] = await db
      .update(instagramConnectionsTable)
      .set({
        accessToken: parsed.data.accessToken,
        igUserId: parsed.data.igUserId,
        updatedAt: new Date(),
      })
      .where(eq(instagramConnectionsTable.userId, userId))
      .returning();
    res.json({ connected: true, igUserId: updated.igUserId, instagramHandle: updated.instagramHandle });
    return;
  }

  const [conn] = await db
    .insert(instagramConnectionsTable)
    .values({ ...parsed.data, userId })
    .returning();

  res.json({ connected: true, igUserId: conn.igUserId, instagramHandle: conn.instagramHandle });
});

router.get("/instagram/status", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const conns = await db
    .select()
    .from(instagramConnectionsTable)
    .where(eq(instagramConnectionsTable.userId, userId))
    .limit(1);

  if (!conns.length) {
    res.json({ connected: false, igUserId: null, instagramHandle: null });
    return;
  }

  res.json({
    connected: true,
    igUserId: conns[0].igUserId,
    instagramHandle: conns[0].instagramHandle,
  });
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { schedulesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import {
  CreateScheduleBody,
  CreateScheduleResponse,
  GetScheduleResponse,
  UpdateScheduleBody,
  UpdateScheduleResponse,
} from "@workspace/api-zod";

const router = Router();

router.get("/schedules", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const schedules = await db
    .select()
    .from(schedulesTable)
    .where(eq(schedulesTable.userId, userId))
    .limit(1);

  if (!schedules.length) {
    res.status(404).json({ error: "No schedule found" });
    return;
  }

  res.json(GetScheduleResponse.parse(schedules[0]));
});

router.post("/schedules", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const parsed = CreateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(schedulesTable)
    .where(eq(schedulesTable.userId, userId))
    .limit(1);

  if (existing.length) {
    const [updated] = await db
      .update(schedulesTable)
      .set(parsed.data)
      .where(eq(schedulesTable.userId, userId))
      .returning();
    res.status(201).json(CreateScheduleResponse.parse(updated));
    return;
  }

  const [schedule] = await db
    .insert(schedulesTable)
    .values({ ...parsed.data, userId })
    .returning();

  res.status(201).json(CreateScheduleResponse.parse(schedule));
});

router.patch("/schedules", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const parsed = UpdateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [schedule] = await db
    .update(schedulesTable)
    .set(parsed.data)
    .where(eq(schedulesTable.userId, userId))
    .returning();

  if (!schedule) {
    res.status(404).json({ error: "No schedule found" });
    return;
  }

  res.json(UpdateScheduleResponse.parse(schedule));
});

export default router;

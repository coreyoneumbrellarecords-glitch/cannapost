import { Router } from "express";
import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { requireAuth, getUserId } from "../lib/auth";
import {
  CreateBrandProfileBody,
  CreateBrandProfileResponse,
  GetBrandProfileResponse,
  UpdateBrandProfileBody,
  UpdateBrandProfileResponse,
} from "@workspace/api-zod";
import { normalizeApiIds } from "../lib/apiResponse";

const router = Router();

function deriveVisualFingerprint(values: Record<string, unknown>): string {
  const signature = [
    values.businessName,
    values.primaryColor,
    values.secondaryColor,
    values.accentColor,
    values.backgroundColor,
    values.fontStyle,
    values.layoutGrid,
    values.visualMotif,
    values.toneOfVoice,
  ].map((value) => String(value ?? "").trim().toUpperCase()).join("|");
  return createHash("sha256").update(signature).digest("hex").slice(0, 24);
}

router.get("/brand", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const profiles = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.userId, userId))
    .limit(1);

  if (!profiles.length) {
    res.status(404).json({ error: "Brand profile not found" });
    return;
  }

  res.json(GetBrandProfileResponse.parse(normalizeApiIds(profiles[0])));
});

router.post("/brand", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const parsed = CreateBrandProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.userId, userId))
    .limit(1);

  if (existing.length) {
    res
      .status(409)
      .json({ error: "Brand profile already exists. Use PATCH to update." });
    return;
  }

  const profileValues = {
    ...parsed.data,
    visualFingerprint: deriveVisualFingerprint(parsed.data),
    userId,
  };
  const [profile] = await db
    .insert(brandProfilesTable)
    .values(profileValues)
    .returning();

  res
    .status(201)
    .json(CreateBrandProfileResponse.parse(normalizeApiIds(profile)));
});

router.patch("/brand", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const parsed = UpdateBrandProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.userId, userId))
    .limit(1);
  if (!existing.length) {
    res.status(404).json({ error: "Brand profile not found" });
    return;
  }
  const merged = { ...existing[0], ...parsed.data };
  const [profile] = await db
    .update(brandProfilesTable)
    .set({
      ...parsed.data,
      visualFingerprint: deriveVisualFingerprint(merged),
      updatedAt: new Date(),
    })
    .where(eq(brandProfilesTable.userId, userId))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Brand profile not found" });
    return;
  }

  res.json(UpdateBrandProfileResponse.parse(normalizeApiIds(profile)));
});

export default router;

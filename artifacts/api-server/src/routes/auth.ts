import { Router } from "express";
import { getAuth } from "@clerk/express";
import { requireAuth, getUserId } from "../lib/auth";

const router = Router();

router.get("/auth/me", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const auth = getAuth(req);

  res.json({
    id: userId,
    email: auth?.sessionClaims?.email ?? null,
    createdAt: new Date().toISOString(),
  });
});

export default router;

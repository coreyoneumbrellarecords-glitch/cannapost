import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

// TESTING ONLY — remove before launch
const DEV_BYPASS_USER = "dev-bypass-user";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Dev bypass: allow through with a fixed test userId in development
  if (process.env.NODE_ENV !== "production" && req.headers["x-dev-bypass"] === "true") {
    (req as any).userId = DEV_BYPASS_USER;
    next();
    return;
  }

  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = userId;
  next();
};

export const getUserId = (req: Request): string => {
  return (req as any).userId as string;
};

import { Request, Response, NextFunction } from "express";
import { UserRole, AuthUser } from "../models/index.js";

/**
 * Middleware: requires the authenticated user to have the "admin" role.
 * Must be used AFTER requireAuth middleware.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const roleDoc = await UserRole.findOne({ user_id: userId }).lean();
  if (!roleDoc || (roleDoc as any).role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}

/**
 * Middleware: requires the authenticated user to have an approved or active approval_status.
 * Must be used AFTER requireAuth middleware.
 */
export async function requireApproval(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const authUser = await AuthUser.findOne({ user_id: userId }).lean();
  if (!authUser) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const status = (authUser as any).approval_status || "active";
  if (status === "active" || status === "approved") {
    next();
    return;
  }

  res.status(403).json({
    error: "Account not approved",
    approval_status: status,
  });
}

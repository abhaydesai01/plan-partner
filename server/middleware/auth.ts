import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

/** Test token format: Bearer test:doctor:<uuid> or Bearer test:patient:<uuid> (only when NODE_ENV=test) */
function getTestUserId(token: string): string | null {
  if (process.env.NODE_ENV !== "test") return null;
  const match = token.match(/^test:(?:doctor|patient):([a-f0-9-]{36})$/i);
  return match ? match[1] : null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Missing or invalid authorization" });
    return;
  }

  const testId = getTestUserId(token);
  if (testId) {
    (req as Request & { user: { id: string } }).user = { id: testId };
    next();
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    (req as Request & { user: { id: string } }).user = { id: user.id };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/** Optional auth: sets req.user if token present, does not 401. */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    next();
    return;
  }

  const testId = getTestUserId(token);
  if (testId) {
    (req as Request & { user?: { id: string } }).user = { id: testId };
    next();
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) (req as Request & { user?: { id: string } }).user = { id: user.id };
  } catch {
    // ignore
  }
  next();
}

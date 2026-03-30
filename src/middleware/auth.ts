import type { Context, MiddlewareHandler, Next } from "hono";
import { verifyJwt, extractBearerToken } from "../lib/auth.js";
import type { Env } from "../worker-env.js";
import type { JwtPayload } from "../types/index.js";

declare module "hono" {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

export const requireAuth: MiddlewareHandler<{ Bindings: Env }> = async (
  c: Context<{ Bindings: Env }>,
  next: Next,
) => {
  const token = extractBearerToken(c.req.header("Authorization") ?? null);
  if (!token) {
    return c.json({ success: false, error: "Unauthorised" }, 401);
  }

  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }

  c.set("user", payload);
  return next();
};

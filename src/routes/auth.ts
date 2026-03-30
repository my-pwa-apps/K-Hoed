import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { hashPassword, verifyPassword, signJwt } from "../lib/auth.js";
import { getUserByEmail, getUserById, createUser } from "../lib/db.js";
import { newId } from "../lib/room-code.js";
import { checkRateLimit } from "../lib/rate-limit.js";
import { requireAuth } from "../middleware/auth.js";
import type { Env } from "../worker-env.js";

const app = new Hono<{ Bindings: Env }>();

// ─── Register ─────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email().max(254),
  display_name: z.string().min(2).max(40).trim(),
  password: z.string().min(8).max(128),
  turnstile_token: z.string().optional(),
});

app.post("/register", zValidator("json", registerSchema), async (c) => {
  // Rate-limit per IP: 5 registrations per minute
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  if (!checkRateLimit(`register:${ip}`, 5, 60_000)) {
    return c.json({ success: false, error: "Too many requests" }, 429);
  }

  const body = c.req.valid("json");

  // Validate Turnstile token if configured
  if (c.env.TURNSTILE_SECRET_KEY && body.turnstile_token) {
    const ok = await verifyTurnstile(body.turnstile_token, c.env.TURNSTILE_SECRET_KEY, ip);
    if (!ok) {
      return c.json({ success: false, error: "CAPTCHA verification failed" }, 400);
    }
  }

  const existing = await getUserByEmail(c.env.DB, body.email);
  if (existing) {
    return c.json({ success: false, error: "Email already registered" }, 409);
  }

  const id = newId();
  const passwordHash = await hashPassword(body.password);
  await createUser(c.env.DB, {
    id,
    email: body.email,
    display_name: body.display_name,
    password_hash: passwordHash,
  });

  const token = await signJwt(
    { sub: id, email: body.email, display_name: body.display_name },
    c.env.JWT_SECRET,
  );

  return c.json({
    success: true,
    data: {
      token,
      user: { id, email: body.email, display_name: body.display_name },
    },
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstile_token: z.string().optional(),
});

app.post("/login", zValidator("json", loginSchema), async (c) => {
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
    return c.json({ success: false, error: "Too many requests" }, 429);
  }

  const body = c.req.valid("json");

  const user = await getUserByEmail(c.env.DB, body.email);
  if (!user) {
    // Constant-time-ish: still run hash to avoid timing oracle
    await hashPassword("placeholder");
    return c.json({ success: false, error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) {
    return c.json({ success: false, error: "Invalid credentials" }, 401);
  }

  const token = await signJwt(
    { sub: user.id, email: user.email, display_name: user.display_name },
    c.env.JWT_SECRET,
  );

  return c.json({
    success: true,
    data: {
      token,
      user: { id: user.id, email: user.email, display_name: user.display_name },
    },
  });
});

// ─── Me ──────────────────────────────────────────────────────────────────────

app.get("/me", requireAuth, async (c) => {
  const payload = c.get("user");
  const user = await getUserById(c.env.DB, payload.sub);
  if (!user) return c.json({ success: false, error: "User not found" }, 404);

  return c.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      created_at: user.created_at,
    },
  });
});

// ─── Turnstile validation ─────────────────────────────────────────────────────

async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string,
): Promise<boolean> {
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  body.append("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}

export { app as authRoutes };

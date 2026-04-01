import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getQuizById, getQuizByBrainstormToken, updateQuiz } from "../lib/db.js";
import { newId } from "../lib/room-code.js";
import { checkRateLimit } from "../lib/rate-limit.js";
import type { BrainstormItem } from "../types/index.js";
import type { Env } from "../worker-env.js";

const app = new Hono<{ Bindings: Env }>();

// ─── POST /api/brainstorm/invite/:quizId ──────────────────────────────────────
// Owner generates (or retrieves) a brainstorm invite token.

app.post("/invite/:quizId", requireAuth, async (c) => {
  const user = c.get("user");
  const quizId = c.req.param("quizId");

  const quiz = await getQuizById(c.env.DB, quizId);
  if (!quiz) return c.json({ success: false, error: "Quiz not found" }, 404);
  if (quiz.owner_id !== user.sub) return c.json({ success: false, error: "Forbidden" }, 403);

  // Return existing token or generate a new one
  const token = quiz.brainstorm_token ?? newId();
  if (!quiz.brainstorm_token) {
    await updateQuiz(c.env.DB, quizId, { brainstorm_token: token });
  }

  return c.json({ success: true, data: { token } });
});

// ─── DELETE /api/brainstorm/invite/:quizId ────────────────────────────────────
// Owner revokes the invite token (disables collab access).

app.delete("/invite/:quizId", requireAuth, async (c) => {
  const user = c.get("user");
  const quizId = c.req.param("quizId");

  const quiz = await getQuizById(c.env.DB, quizId);
  if (!quiz) return c.json({ success: false, error: "Quiz not found" }, 404);
  if (quiz.owner_id !== user.sub) return c.json({ success: false, error: "Forbidden" }, 403);

  await updateQuiz(c.env.DB, quizId, { brainstorm_token: null });
  return c.json({ success: true, data: null });
});

// ─── GET /api/brainstorm/:token ───────────────────────────────────────────────
// Public — returns quiz title + all brainstorm items for this token.

app.get("/:token", async (c) => {
  const token = c.req.param("token");
  const quiz = await getQuizByBrainstormToken(c.env.DB, token);
  if (!quiz) return c.json({ success: false, error: "Invite link not found or revoked" }, 404);

  const items: BrainstormItem[] = quiz.brainstorm ? (JSON.parse(quiz.brainstorm) as BrainstormItem[]) : [];
  return c.json({
    success: true,
    data: {
      quiz_title: quiz.title,
      quiz_id: quiz.id,
      items,
    },
  });
});

// ─── POST /api/brainstorm/:token ──────────────────────────────────────────────
// Public — add a brainstorm idea.

const addItemSchema = z.object({
  text: z.string().min(1).max(500).trim(),
  notes: z.string().max(1000).trim().nullable().optional(),
  suggested_by: z.string().min(1).max(120).trim(),
});

app.post("/:token", zValidator("json", addItemSchema), async (c) => {
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  if (!checkRateLimit(`brainstorm-add:${ip}`, 30, 60_000)) {
    return c.json({ success: false, error: "Too many requests" }, 429);
  }

  const token = c.req.param("token");
  const body = c.req.valid("json");

  const quiz = await getQuizByBrainstormToken(c.env.DB, token);
  if (!quiz) return c.json({ success: false, error: "Invite link not found or revoked" }, 404);

  const items: BrainstormItem[] = quiz.brainstorm ? (JSON.parse(quiz.brainstorm) as BrainstormItem[]) : [];

  // Prevent runaway growth
  if (items.length >= 200) {
    return c.json({ success: false, error: "Brainstorm board is full (200 ideas max)" }, 422);
  }

  const newItem: BrainstormItem = {
    id: newId(),
    text: body.text,
    notes: body.notes ?? null,
    suggested_by: body.suggested_by,
    status: "proposed",
  };

  items.push(newItem);
  await updateQuiz(c.env.DB, quiz.id, { brainstorm: JSON.stringify(items) });

  return c.json({ success: true, data: newItem }, 201);
});

// ─── DELETE /api/brainstorm/:token/item/:itemId ───────────────────────────────
// Public — remove a brainstorm idea (anyone with the link can prune).

app.delete("/:token/item/:itemId", async (c) => {
  const token = c.req.param("token");
  const itemId = c.req.param("itemId");

  const quiz = await getQuizByBrainstormToken(c.env.DB, token);
  if (!quiz) return c.json({ success: false, error: "Invite link not found or revoked" }, 404);

  const items: BrainstormItem[] = quiz.brainstorm ? (JSON.parse(quiz.brainstorm) as BrainstormItem[]) : [];
  const filtered = items.filter((i) => i.id !== itemId);

  if (filtered.length === items.length) {
    return c.json({ success: false, error: "Item not found" }, 404);
  }

  await updateQuiz(c.env.DB, quiz.id, { brainstorm: filtered.length > 0 ? JSON.stringify(filtered) : null });
  return c.json({ success: true, data: null });
});

export { app as brainstormRoutes };

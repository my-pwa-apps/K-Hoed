import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  getQuizById,
  createSession,
  getSessionByCode,
  getSessionById,
  getSessionsByHost,
  getSessionPlayers,
} from "../lib/db.js";
import { generateRoomCode, newId } from "../lib/room-code.js";
import { checkRateLimit } from "../lib/rate-limit.js";
import { requireAuth } from "../middleware/auth.js";
import type { Env } from "../worker-env.js";

const app = new Hono<{ Bindings: Env }>();

// ─── POST /games — Create session (host only) ─────────────────────────────────

app.post(
  "/",
  requireAuth,
  zValidator("json", z.object({ quiz_id: z.string().uuid() })),
  async (c) => {
    const user = c.get("user");
    const { quiz_id } = c.req.valid("json");

    const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
    if (!checkRateLimit(`create-game:${user.sub}:${ip}`, 5, 60_000)) {
      return c.json({ success: false, error: "Too many sessions created" }, 429);
    }

    const quiz = await getQuizById(c.env.DB, quiz_id);
    if (!quiz) return c.json({ success: false, error: "Quiz not found" }, 404);
    if (quiz.owner_id !== user.sub) return c.json({ success: false, error: "Forbidden" }, 403);

    // Generate a unique room code (retry on collision, max 5 tries)
    let roomCode = "";
    for (let i = 0; i < 5; i++) {
      const candidate = generateRoomCode();
      const existing = await getSessionByCode(c.env.DB, candidate);
      if (!existing || existing.status === "ended") {
        roomCode = candidate;
        break;
      }
    }
    if (!roomCode) {
      return c.json({ success: false, error: "Could not generate room code" }, 500);
    }

    const sessionId = newId();
    await createSession(c.env.DB, {
      id: sessionId,
      quiz_id,
      host_id: user.sub,
      room_code: roomCode,
    });

    return c.json({
      success: true,
      data: { session_id: sessionId, room_code: roomCode },
    }, 201);
  },
);

// ─── GET /games — List host's sessions ───────────────────────────────────────

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const sessions = await getSessionsByHost(c.env.DB, user.sub);
  return c.json({ success: true, data: sessions });
});

// ─── GET /games/:code — Look up a session by room code (public) ───────────────

app.get("/:code", async (c) => {
  const code = c.req.param("code").toUpperCase();

  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  if (!checkRateLimit(`lookup:${ip}`, 20, 60_000)) {
    return c.json({ success: false, error: "Too many requests" }, 429);
  }

  const session = await getSessionByCode(c.env.DB, code);
  if (!session) return c.json({ success: false, error: "Room not found" }, 404);
  if (session.status === "ended") {
    return c.json({ success: false, error: "Game has ended", code: "ENDED" }, 410);
  }

  return c.json({
    success: true,
    data: {
      session_id: session.id,
      room_code: session.room_code,
      status: session.status,
    },
  });
});

// ─── GET /games/:code/players — Players in a session ─────────────────────────

app.get("/:code/players", requireAuth, async (c) => {
  const user = c.get("user");
  const session = await getSessionByCode(c.env.DB, c.req.param("code").toUpperCase());
  if (!session) return c.json({ success: false, error: "Room not found" }, 404);
  if (session.host_id !== user.sub) return c.json({ success: false, error: "Forbidden" }, 403);

  const players = await getSessionPlayers(c.env.DB, session.id);
  return c.json({ success: true, data: players });
});

// ─── GET /games/session/:id/results ───────────────────────────────────────────

app.get("/session/:id/results", requireAuth, async (c) => {
  const user = c.get("user");
  const session = await getSessionById(c.env.DB, c.req.param("id"));
  if (!session) return c.json({ success: false, error: "Session not found" }, 404);
  if (session.host_id !== user.sub) return c.json({ success: false, error: "Forbidden" }, 403);

  const players = await getSessionPlayers(c.env.DB, session.id);
  return c.json({ success: true, data: { session, players } });
});

export { app as gameRoutes };

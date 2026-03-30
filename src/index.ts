import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth.js";
import { quizRoutes } from "./routes/quizzes.js";
import { gameRoutes } from "./routes/games.js";
import { uploadRoutes } from "./routes/upload.js";
import type { Env } from "./worker-env.js";

// Re-export Durable Object class
export { GameRoom } from "./durable-objects/GameRoom.js";

const app = new Hono<{ Bindings: Env }>();

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      // Allow all origins in development; lock down in production
      return origin ?? "*";
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

// ─── API routes ───────────────────────────────────────────────────────────────

app.route("/api/auth", authRoutes);
app.route("/api/quizzes", quizRoutes);
app.route("/api/games", gameRoutes);
app.route("/api/upload", uploadRoutes);

// ─── WebSocket — delegate to Durable Object ───────────────────────────────────

app.get("/api/rooms/:code/ws", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const id = c.env.GAME_ROOM.idFromName(code);
  const stub = c.env.GAME_ROOM.get(id);
  return stub.fetch(c.req.raw);
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/api/health", (c) =>
  c.json({ status: "ok", ts: Date.now(), env: c.env.ENVIRONMENT }),
);

// ─── Fallthrough — serve SPA ──────────────────────────────────────────────────

app.get("*", async (c) => {
  // All non-API routes served by the static asset binding (React SPA)
  return c.env.ASSETS.fetch(
    new Request(new URL("/index.html", c.req.url).toString()),
  );
});

export default app;

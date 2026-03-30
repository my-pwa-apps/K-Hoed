import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { checkRateLimit } from "../lib/rate-limit.js";
import { newId } from "../lib/room-code.js";
import type { Env } from "../worker-env.js";

const app = new Hono<{ Bindings: Env }>();

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

app.post("/", requireAuth, async (c) => {
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  if (!checkRateLimit(`upload:${ip}`, 20, 60_000)) {
    return c.json({ success: false, error: "Upload rate limit exceeded" }, 429);
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) return c.json({ success: false, error: "Invalid form data" }, 400);

  const fileEntry = formData.get("file");
  if (!fileEntry || typeof fileEntry === "string") {
    return c.json({ success: false, error: "No file field in form data" }, 400);
  }
  const file = fileEntry as unknown as File;

  if (!ALLOWED_MIME.has(file.type)) {
    return c.json(
      { success: false, error: "Only JPEG, PNG, WebP, and GIF images are accepted" },
      415,
    );
  }

  if (file.size > MAX_SIZE) {
    return c.json({ success: false, error: "File exceeds 5 MB limit" }, 413);
  }

  const ext = file.type.split("/")[1]!; // safe: vetted against ALLOWED_MIME
  const key = `quiz-images/${newId()}.${ext}`;
  const buffer = await file.arrayBuffer();

  await c.env.IMAGES.put(key, buffer, {
    httpMetadata: { contentType: file.type },
    customMetadata: {
      uploadedBy: c.get("user").sub,
      originalName: file.name.slice(0, 100),
    },
  });

  const publicUrl = `${c.env.R2_PUBLIC_URL ?? ""}/${key}`;
  return c.json({ success: true, data: { url: publicUrl, key } }, 201);
});

export { app as uploadRoutes };

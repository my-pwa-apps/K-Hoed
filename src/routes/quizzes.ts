import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  getQuizzesByOwner,
  getQuizWithQuestions,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  replaceQuizQuestions,
} from "../lib/db.js";
import { newId } from "../lib/room-code.js";
import { requireAuth } from "../middleware/auth.js";
import type { Env } from "../worker-env.js";

const app = new Hono<{ Bindings: Env }>();

// All quiz routes require authentication
app.use("*", requireAuth);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const answerOptionSchema = z.object({
  id: z.string().uuid().optional(),
  text: z.string().min(1).max(300).trim(),
  is_correct: z.boolean(),
  order_index: z.number().int().min(0),
});

const sliderConfigSchema = z.object({
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  correct: z.number(),
  tolerance: z.number().min(0),
});

const pinAnswerConfigSchema = z.object({
  hotspotX: z.number().min(0).max(1),
  hotspotY: z.number().min(0).max(1),
  hotspotRadius: z.number().min(0.01).max(0.5),
});

const brainstormItemSchema = z.object({
  id: z.string().min(1).max(100),
  text: z.string().min(1).max(500).trim(),
  notes: z.string().max(1000).trim().nullable().optional(),
  suggested_by: z.string().max(120).trim().nullable().optional(),
  status: z.enum(["proposed", "shortlisted", "added"]).default("proposed"),
});

const questionSchema = z.object({
  id: z.string().uuid().optional(),
  text: z.string().min(1).max(1000).trim(),
  image_url: z.string().url().max(512).nullable().optional(),
  type: z.enum(["classic", "multiple", "truefalse", "typeanswer", "slider", "puzzle", "pinanswer"]),
  time_limit: z.number().int().min(5).max(120).default(20),
  points: z.number().int().min(100).max(10000).default(1000),
  order_index: z.number().int().min(0),
  answer_options: z.array(answerOptionSchema).max(8).default([]),
  config: z.union([sliderConfigSchema, pinAnswerConfigSchema]).nullable().optional(),
});

const quizCreateSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).trim().nullable().optional(),
  is_public: z.boolean().default(false),
  brainstorm: z.array(brainstormItemSchema).max(200).optional().default([]),
  questions: z.array(questionSchema).max(100).optional().default([]),
});

const quizUpdateSchema = quizCreateSchema.partial();

// Serialize Zod validation errors to a readable string for the client
function zodHook<T>(
  result: { success: boolean; error?: import("zod").ZodError; data?: T },
  c: import("hono").Context,
): Response | void {
  if (!result.success && result.error) {
    const msg = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return c.json({ success: false, error: msg }, 400) as unknown as Response;
  }
}

// ─── GET /quizzes ─────────────────────────────────────────────────────────────

app.get("/", async (c) => {
  const user = c.get("user");
  const quizzes = await getQuizzesByOwner(c.env.DB, user.sub);
  return c.json({
    success: true,
    data: quizzes.map((quiz) => ({
      ...quiz,
      is_public: quiz.is_public === 1,
      brainstorm: quiz.brainstorm ? JSON.parse(quiz.brainstorm) : [],
    })),
  });
});

// ─── POST /quizzes ────────────────────────────────────────────────────────────

app.post("/", zValidator("json", quizCreateSchema, zodHook), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  // Validate answer correctness per question type
  const validationError = validateQuestions(body.questions ?? []);
  if (validationError) {
    return c.json({ success: false, error: validationError }, 400);
  }

  const quizId = newId();
  await createQuiz(c.env.DB, {
    id: quizId,
    title: body.title,
    description: body.description ?? null,
    owner_id: user.sub,
    is_public: body.is_public ? 1 : 0,
    brainstorm: body.brainstorm.length > 0 ? JSON.stringify(body.brainstorm) : null,
  });

  if (body.questions && body.questions.length > 0) {
    const { questions, answerOptions } = normaliseQuestions(quizId, body.questions);
    await replaceQuizQuestions(c.env.DB, quizId, questions, answerOptions);
  }

  const created = await getQuizWithQuestions(c.env.DB, quizId);
  return c.json({ success: true, data: created }, 201);
});

// ─── GET /quizzes/:id ─────────────────────────────────────────────────────────

app.get("/:id", async (c) => {
  const user = c.get("user");
  const quiz = await getQuizWithQuestions(c.env.DB, c.req.param("id"));
  if (!quiz) return c.json({ success: false, error: "Quiz not found" }, 404);
  if (quiz.owner_id !== user.sub) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }
  return c.json({ success: true, data: quiz });
});

// ─── PUT /quizzes/:id ─────────────────────────────────────────────────────────

app.put("/:id", zValidator("json", quizUpdateSchema, zodHook), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const quizId = c.req.param("id") as string;

  const quiz = await getQuizById(c.env.DB, quizId);
  if (!quiz) return c.json({ success: false, error: "Quiz not found" }, 404);
  if (quiz.owner_id !== user.sub) return c.json({ success: false, error: "Forbidden" }, 403);

  if (body.questions !== undefined) {
    const validationError = validateQuestions(body.questions);
    if (validationError) return c.json({ success: false, error: validationError }, 400);
  }

  const updateData: Parameters<typeof updateQuiz>[2] = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.is_public !== undefined) updateData.is_public = body.is_public ? 1 : 0;
  if (body.brainstorm !== undefined) {
    updateData.brainstorm = body.brainstorm.length > 0 ? JSON.stringify(body.brainstorm) : null;
  }
  await updateQuiz(c.env.DB, quizId, updateData);

  if (body.questions !== undefined) {
    const { questions, answerOptions } = normaliseQuestions(quizId, body.questions);
    await replaceQuizQuestions(c.env.DB, quizId, questions, answerOptions);
  }

  const updated = await getQuizWithQuestions(c.env.DB, quizId);
  return c.json({ success: true, data: updated });
});

// ─── DELETE /quizzes/:id ──────────────────────────────────────────────────────

app.delete("/:id", async (c) => {
  const user = c.get("user");
  const quizId = c.req.param("id");

  const quiz = await getQuizById(c.env.DB, quizId);
  if (!quiz) return c.json({ success: false, error: "Quiz not found" }, 404);
  if (quiz.owner_id !== user.sub) return c.json({ success: false, error: "Forbidden" }, 403);

  await deleteQuiz(c.env.DB, quizId);
  return c.json({ success: true, data: null });
});

// ─── POST /quizzes/:id/duplicate ──────────────────────────────────────────────

app.post("/:id/duplicate", async (c) => {
  const user = c.get("user");
  const source = await getQuizWithQuestions(c.env.DB, c.req.param("id"));
  if (!source) return c.json({ success: false, error: "Quiz not found" }, 404);
  if (source.owner_id !== user.sub) return c.json({ success: false, error: "Forbidden" }, 403);

  const newQuizId = newId();
  await createQuiz(c.env.DB, {
    id: newQuizId,
    title: `${source.title} (copy)`,
    description: source.description,
    owner_id: user.sub,
    is_public: 0,
    brainstorm: source.brainstorm.length > 0 ? JSON.stringify(source.brainstorm) : null,
  });

  if (source.questions.length > 0) {
    const questions = source.questions.map((q) => ({
      id: newId(),
      text: q.text,
      image_url: q.image_url,
      type: q.type,
      time_limit: q.time_limit,
      points: q.points,
      order_index: q.order_index,
      config: q.config ? JSON.stringify(q.config) : null,
    }));
    const answerOptions = source.questions.flatMap((q, qi) =>
      q.answer_options.map((a) => ({
        id: newId(),
        question_id: questions[qi]!.id,
        text: a.text,
        is_correct: a.is_correct ? 1 : 0,
        order_index: a.order_index,
      })),
    );
    await replaceQuizQuestions(c.env.DB, newQuizId, questions, answerOptions as never);
  }

  const created = await getQuizWithQuestions(c.env.DB, newQuizId);
  return c.json({ success: true, data: created }, 201);
});

// ─── POST /quizzes/:id/export ─────────────────────────────────────────────────

app.get("/:id/export", async (c) => {
  const user = c.get("user");
  const quiz = await getQuizWithQuestions(c.env.DB, c.req.param("id"));
  if (!quiz) return c.json({ success: false, error: "Quiz not found" }, 404);
  if (quiz.owner_id !== user.sub) return c.json({ success: false, error: "Forbidden" }, 403);
  return c.json({ success: true, data: quiz });
});

// ─── POST /quizzes/import ─────────────────────────────────────────────────────

app.post("/import", zValidator("json", quizCreateSchema, zodHook), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const validationError = validateQuestions(body.questions ?? []);
  if (validationError) return c.json({ success: false, error: validationError }, 400);

  const quizId = newId();
  await createQuiz(c.env.DB, {
    id: quizId,
    title: body.title,
    description: body.description ?? null,
    owner_id: user.sub,
    is_public: body.is_public ? 1 : 0,
    brainstorm: body.brainstorm.length > 0 ? JSON.stringify(body.brainstorm) : null,
  });

  if (body.questions && body.questions.length > 0) {
    const { questions, answerOptions } = normaliseQuestions(quizId, body.questions);
    await replaceQuizQuestions(c.env.DB, quizId, questions, answerOptions);
  }

  const created = await getQuizWithQuestions(c.env.DB, quizId);
  return c.json({ success: true, data: created }, 201);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

type QuestionInput = z.infer<typeof questionSchema>;

function validateQuestions(questions: QuestionInput[]): string | null {
  for (const q of questions) {
    const correctCount = q.answer_options.filter((a) => a.is_correct).length;

    if (q.type === "classic" || q.type === "truefalse") {
      if (correctCount !== 1) {
        return `Question "${q.text}" must have exactly 1 correct answer for type "${q.type}"`;
      }
    }
    if (q.type === "multiple") {
      if (correctCount < 2) {
        return `Question "${q.text}" must have at least 2 correct answers for type "multiple"`;
      }
    }
    if (q.type === "truefalse" && q.answer_options.length !== 2) {
      return `Question "${q.text}" of type "truefalse" must have exactly 2 options`;
    }
    if (q.type === "typeanswer") {
      if (q.answer_options.length < 1 || correctCount < 1) {
        return `Question "${q.text}" of type "typeanswer" must have at least 1 correct answer`;
      }
    }
    if (q.type === "puzzle") {
      if (q.answer_options.length < 2) {
        return `Question "${q.text}" of type "puzzle" must have at least 2 items`;
      }
    }
    if (q.type === "slider") {
      if (!q.config) {
        return `Question "${q.text}" of type "slider" requires a config (min, max, step, correct, tolerance)`;
      }
    }
    if (q.type === "pinanswer") {
      if (!q.image_url) {
        return `Question "${q.text}" of type "pinanswer" requires an uploaded image`;
      }
      if (!q.config) {
        return `Question "${q.text}" of type "pinanswer" requires a hotspot config`;
      }
    }
  }
  return null;
}

function normaliseQuestions(quizId: string, questions: QuestionInput[]) {
  const qRows = questions.map((q) => ({
    id: q.id ?? newId(),
    text: q.text,
    image_url: q.image_url ?? null,
    type: q.type,
    time_limit: q.time_limit,
    points: q.points,
    order_index: q.order_index,
    config: q.config ? JSON.stringify(q.config) : null,
  }));

  const answerOptions = questions.flatMap((q, qi) =>
    q.answer_options.map((a) => ({
      id: a.id ?? newId(),
      question_id: qRows[qi]!.id,
      text: a.text,
      is_correct: a.is_correct ? (1 as const) : (0 as const),
      order_index: a.order_index,
    })),
  );

  return { questions: qRows, answerOptions };
}

export { app as quizRoutes };

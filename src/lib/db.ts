import type { D1Database } from "@cloudflare/workers-types";
import type {
  UserRow,
  QuizRow,
  QuestionRow,
  AnswerOptionRow,
  QuizSessionRow,
  SessionPlayerRow,
  SubmissionRow,
  QuestionWithAnswers,
  QuizWithQuestions,
  BrainstormItem,
} from "../types/index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function row<T>(result: D1Result<T>): T | null {
  return result.results[0] ?? null;
}

function rows<T>(result: D1Result<T>): T[] {
  return result.results;
}

function parseBrainstorm(raw: string | null): BrainstormItem[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as BrainstormItem[];
  } catch {
    return [];
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserByEmail(
  db: D1Database,
  email: string,
): Promise<UserRow | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE email = ?1 LIMIT 1")
    .bind(email.toLowerCase())
    .all<UserRow>();
  return row(result);
}

export async function getUserById(
  db: D1Database,
  id: string,
): Promise<UserRow | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE id = ?1 LIMIT 1")
    .bind(id)
    .all<UserRow>();
  return row(result);
}

export async function createUser(
  db: D1Database,
  user: Omit<UserRow, "created_at" | "updated_at">,
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(user.id, user.email.toLowerCase(), user.display_name, user.password_hash, now, now)
    .run();
}

// ─── Quizzes ─────────────────────────────────────────────────────────────────

export async function getQuizzesByOwner(
  db: D1Database,
  ownerId: string,
): Promise<(QuizRow & { question_count: number })[]> {
  const result = await db
    .prepare(
      `SELECT q.*, COUNT(qu.id) AS question_count
       FROM quizzes q
       LEFT JOIN questions qu ON qu.quiz_id = q.id
       WHERE q.owner_id = ?1
       GROUP BY q.id
       ORDER BY q.updated_at DESC`,
    )
    .bind(ownerId)
    .all<QuizRow & { question_count: number }>();
  return rows(result);
}

export async function getQuizById(
  db: D1Database,
  id: string,
): Promise<QuizRow | null> {
  const result = await db
    .prepare("SELECT * FROM quizzes WHERE id = ?1 LIMIT 1")
    .bind(id)
    .all<QuizRow>();
  return row(result);
}

export async function getQuizWithQuestions(
  db: D1Database,
  id: string,
): Promise<QuizWithQuestions | null> {
  const quiz = await getQuizById(db, id);
  if (!quiz) return null;

  const questionsResult = await db
    .prepare(
      `SELECT * FROM questions WHERE quiz_id = ?1 ORDER BY order_index ASC`,
    )
    .bind(id)
    .all<QuestionRow>();
  const questionRows = rows(questionsResult);

  if (questionRows.length === 0) {
    return {
      ...quiz,
      is_public: quiz.is_public === 1,
      brainstorm: parseBrainstorm(quiz.brainstorm),
      questions: [],
    } as unknown as QuizWithQuestions;
  }

  const ids = questionRows.map((q) => q.id);
  const placeholders = ids.map((_, i) => `?${i + 1}`).join(", ");
  const answersResult = await db
    .prepare(`SELECT * FROM answer_options WHERE question_id IN (${placeholders}) ORDER BY order_index ASC`)
    .bind(...ids)
    .all<AnswerOptionRow>();
  const answerRows = rows(answersResult);

  const answersByQuestion = new Map<string, AnswerOptionRow[]>();
  for (const a of answerRows) {
    if (!answersByQuestion.has(a.question_id)) {
      answersByQuestion.set(a.question_id, []);
    }
    answersByQuestion.get(a.question_id)!.push(a);
  }

  const questions: QuestionWithAnswers[] = questionRows.map((q) => ({
    ...q,
    config: q.config ? (JSON.parse(q.config) as import("../types/index.js").QuestionConfig) : null,
    answer_options: (answersByQuestion.get(q.id) ?? []).map((a) => ({
      id: a.id,
      text: a.text,
      is_correct: a.is_correct === 1,
      order_index: a.order_index,
    })),
  }));

  return {
    ...quiz,
    is_public: quiz.is_public === 1,
    brainstorm: parseBrainstorm(quiz.brainstorm),
    questions,
  } as unknown as QuizWithQuestions;
}

export async function createQuiz(
  db: D1Database,
  quiz: Pick<QuizRow, "id" | "title" | "description" | "owner_id" | "is_public" | "brainstorm">,
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO quizzes (id, title, description, owner_id, is_public, brainstorm, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(quiz.id, quiz.title, quiz.description, quiz.owner_id, quiz.is_public ? 1 : 0, quiz.brainstorm, now, now)
    .run();
}

export async function getQuizByBrainstormToken(
  db: D1Database,
  token: string,
): Promise<QuizRow | null> {
  const result = await db
    .prepare("SELECT * FROM quizzes WHERE brainstorm_token = ?1 LIMIT 1")
    .bind(token)
    .all<QuizRow>();
  return row(result);
}

export async function updateQuiz(
  db: D1Database,
  id: string,
  data: Partial<Pick<QuizRow, "title" | "description" | "is_public" | "brainstorm" | "brainstorm_token">>,
): Promise<void> {
  const now = Date.now();
  const sets: string[] = ["updated_at = ?1"];
  const binds: unknown[] = [now];
  let idx = 2;

  if (data.title !== undefined) {
    sets.push(`title = ?${idx++}`);
    binds.push(data.title);
  }
  if (data.description !== undefined) {
    sets.push(`description = ?${idx++}`);
    binds.push(data.description);
  }
  if (data.is_public !== undefined) {
    sets.push(`is_public = ?${idx++}`);
    binds.push(data.is_public ? 1 : 0);
  }
  if (data.brainstorm !== undefined) {
    sets.push(`brainstorm = ?${idx++}`);
    binds.push(data.brainstorm);
  }
  if (data.brainstorm_token !== undefined) {
    sets.push(`brainstorm_token = ?${idx++}`);
    binds.push(data.brainstorm_token);
  }

  binds.push(id);
  await db
    .prepare(`UPDATE quizzes SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...binds)
    .run();
}

export async function deleteQuiz(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM quizzes WHERE id = ?1").bind(id).run();
}

// ─── Questions ────────────────────────────────────────────────────────────────

export async function replaceQuizQuestions(
  db: D1Database,
  quizId: string,
  questions: Omit<QuestionRow, "quiz_id" | "created_at">[],
  answerOptions: Omit<AnswerOptionRow, "created_at">[],  // question_id must be included
): Promise<void> {
  // D1 batch for atomicity
  const stmts: D1PreparedStatement[] = [
    db.prepare("DELETE FROM questions WHERE quiz_id = ?1").bind(quizId),
  ];

  const now = Date.now();
  for (const q of questions) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO questions (id, quiz_id, text, image_url, type, time_limit, points, order_index, config, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
        )
        .bind(q.id, quizId, q.text, q.image_url, q.type, q.time_limit, q.points, q.order_index, q.config ?? null, now),
    );
  }

  for (const a of answerOptions) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO answer_options (id, question_id, text, is_correct, order_index)
           VALUES (?1, ?2, ?3, ?4, ?5)`,
        )
        .bind(a.id, a.question_id, a.text, a.is_correct, a.order_index),
    );
  }

  // Also bump quiz updated_at
  stmts.push(
    db.prepare("UPDATE quizzes SET updated_at = ?1 WHERE id = ?2").bind(now, quizId),
  );

  await db.batch(stmts);
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession(
  db: D1Database,
  session: Pick<QuizSessionRow, "id" | "quiz_id" | "host_id" | "room_code">,
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO quiz_sessions (id, quiz_id, host_id, room_code, status, created_at)
       VALUES (?1, ?2, ?3, ?4, 'lobby', ?5)`,
    )
    .bind(session.id, session.quiz_id, session.host_id, session.room_code, now)
    .run();
}

export async function getSessionByCode(
  db: D1Database,
  code: string,
): Promise<QuizSessionRow | null> {
  const result = await db
    .prepare("SELECT * FROM quiz_sessions WHERE room_code = ?1 LIMIT 1")
    .bind(code.toUpperCase())
    .all<QuizSessionRow>();
  return row(result);
}

export async function getSessionById(
  db: D1Database,
  id: string,
): Promise<QuizSessionRow | null> {
  const result = await db
    .prepare("SELECT * FROM quiz_sessions WHERE id = ?1 LIMIT 1")
    .bind(id)
    .all<QuizSessionRow>();
  return row(result);
}

export async function updateSessionStatus(
  db: D1Database,
  id: string,
  status: "lobby" | "active" | "ended",
  extra?: { started_at?: number; ended_at?: number },
): Promise<void> {
  const sets = ["status = ?1"];
  const binds: unknown[] = [status];
  let idx = 2;

  if (extra?.started_at !== undefined) {
    sets.push(`started_at = ?${idx++}`);
    binds.push(extra.started_at);
  }
  if (extra?.ended_at !== undefined) {
    sets.push(`ended_at = ?${idx++}`);
    binds.push(extra.ended_at);
  }

  binds.push(id);
  await db
    .prepare(`UPDATE quiz_sessions SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...binds)
    .run();
}

export async function getSessionsByHost(
  db: D1Database,
  hostId: string,
  limit = 20,
): Promise<QuizSessionRow[]> {
  const result = await db
    .prepare(
      `SELECT * FROM quiz_sessions WHERE host_id = ?1 ORDER BY created_at DESC LIMIT ?2`,
    )
    .bind(hostId, limit)
    .all<QuizSessionRow>();
  return rows(result);
}

// ─── Players ──────────────────────────────────────────────────────────────────

export async function upsertSessionPlayer(
  db: D1Database,
  player: Pick<SessionPlayerRow, "id" | "session_id" | "display_name" | "avatar_emoji">,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO session_players (id, session_id, display_name, avatar_emoji, score, joined_at)
       VALUES (?1, ?2, ?3, ?4, 0, ?5)
       ON CONFLICT(id) DO NOTHING`,
    )
    .bind(player.id, player.session_id, player.display_name, player.avatar_emoji, Date.now())
    .run();
}

export async function updatePlayerScore(
  db: D1Database,
  playerId: string,
  score: number,
): Promise<void> {
  await db
    .prepare("UPDATE session_players SET score = ?1 WHERE id = ?2")
    .bind(score, playerId)
    .run();
}

export async function getSessionPlayers(
  db: D1Database,
  sessionId: string,
): Promise<SessionPlayerRow[]> {
  const result = await db
    .prepare("SELECT * FROM session_players WHERE session_id = ?1 ORDER BY score DESC")
    .bind(sessionId)
    .all<SessionPlayerRow>();
  return rows(result);
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export async function recordSubmission(
  db: D1Database,
  sub: Omit<SubmissionRow, "submitted_at">,
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO submissions
         (id, session_id, player_id, question_id, answer_option_ids,
          is_correct, points_earned, response_time_ms, submitted_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
    .bind(
      sub.id,
      sub.session_id,
      sub.player_id,
      sub.question_id,
      sub.answer_option_ids,
      sub.is_correct ? 1 : 0,
      sub.points_earned,
      sub.response_time_ms,
      Date.now(),
    )
    .run();
}

// ─── Results ─────────────────────────────────────────────────────────────────

export async function saveResults(
  db: D1Database,
  results: Omit<SubmissionRow, "submitted_at">[],
): Promise<void> {
  if (results.length === 0) return;
  const stmts = results.map((r) =>
    db
      .prepare(
        `INSERT OR REPLACE INTO results (id, session_id, player_id, final_score, final_rank, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      )
      .bind(r.id, r.session_id, r.player_id, r.points_earned, r.response_time_ms, Date.now()),
  );
  await db.batch(stmts);
}

// ─── WS Tickets (C1: keep JWT out of WS URL) ─────────────────────────────────

export async function createWsTicket(
  db: D1Database,
  sessionId: string,
  hostId: string,
): Promise<string> {
  // Remove any existing tickets for this session+host first
  await db
    .prepare("DELETE FROM ws_tickets WHERE session_id = ?1 AND host_id = ?2")
    .bind(sessionId, hostId)
    .run();

  const ticket = crypto.randomUUID();
  const expiresAt = Date.now() + 2 * 60 * 60_000; // 2 hours
  await db
    .prepare("INSERT INTO ws_tickets (id, session_id, host_id, expires_at) VALUES (?1, ?2, ?3, ?4)")
    .bind(ticket, sessionId, hostId, expiresAt)
    .run();
  return ticket;
}

export async function consumeWsTicket(
  db: D1Database,
  ticket: string,
): Promise<{ session_id: string; host_id: string } | null> {
  const row = await db
    .prepare("SELECT session_id, host_id FROM ws_tickets WHERE id = ?1 AND expires_at > ?2")
    .bind(ticket, Date.now())
    .first<{ session_id: string; host_id: string }>();
  return row ?? null;
}

// ─── D1-backed rate limiting (C3: survives Worker cold starts) ───────────────

export async function checkRateLimitD1(
  db: D1Database,
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  const row = await db
    .prepare("SELECT count, window_start FROM rate_limits WHERE key = ?1")
    .bind(key)
    .first<{ count: number; window_start: number }>();

  if (!row || now - row.window_start > windowMs) {
    // New window — upsert with count 1
    await db
      .prepare("INSERT OR REPLACE INTO rate_limits (key, count, window_start) VALUES (?1, 1, ?2)")
      .bind(key, now)
      .run();
    return true;
  }

  if (row.count >= maxRequests) return false;

  await db
    .prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?1")
    .bind(key)
    .run();
  return true;
}

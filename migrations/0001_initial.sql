-- migration: 0001_initial
-- D1 (SQLite) schema for K-Hoed quiz platform

PRAGMA foreign_keys = ON;

-- ─── Users ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id           TEXT    PRIMARY KEY,
  email        TEXT    UNIQUE NOT NULL,
  display_name TEXT    NOT NULL,
  password_hash TEXT   NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── Quizzes ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quizzes (
  id          TEXT    PRIMARY KEY,
  title       TEXT    NOT NULL,
  description TEXT,
  owner_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public   INTEGER NOT NULL DEFAULT 0 CHECK(is_public IN (0, 1)),
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quizzes_owner ON quizzes(owner_id);

-- ─── Questions ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS questions (
  id          TEXT    PRIMARY KEY,
  quiz_id     TEXT    NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  text        TEXT    NOT NULL,
  image_url   TEXT,
  type        TEXT    NOT NULL CHECK(type IN ('classic', 'multiple', 'truefalse')),
  time_limit  INTEGER NOT NULL DEFAULT 20,
  points      INTEGER NOT NULL DEFAULT 1000,
  order_index INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id, order_index);

-- ─── Answer options ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS answer_options (
  id          TEXT    PRIMARY KEY,
  question_id TEXT    NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text        TEXT    NOT NULL,
  is_correct  INTEGER NOT NULL DEFAULT 0 CHECK(is_correct IN (0, 1)),
  order_index INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_options_question ON answer_options(question_id);

-- ─── Quiz sessions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id         TEXT    PRIMARY KEY,
  quiz_id    TEXT    NOT NULL REFERENCES quizzes(id),
  host_id    TEXT    NOT NULL REFERENCES users(id),
  room_code  TEXT    UNIQUE NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'lobby' CHECK(status IN ('lobby', 'active', 'ended')),
  started_at INTEGER,
  ended_at   INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_host    ON quiz_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_sessions_code    ON quiz_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_sessions_status  ON quiz_sessions(status);

-- ─── Session players ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_players (
  id           TEXT    PRIMARY KEY,
  session_id   TEXT    NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  display_name TEXT    NOT NULL,
  score        INTEGER NOT NULL DEFAULT 0,
  joined_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_players_session ON session_players(session_id);

-- ─── Answer submissions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS submissions (
  id                TEXT    PRIMARY KEY,
  session_id        TEXT    NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  player_id         TEXT    NOT NULL REFERENCES session_players(id) ON DELETE CASCADE,
  question_id       TEXT    NOT NULL REFERENCES questions(id),
  answer_option_ids TEXT    NOT NULL,                       -- JSON array of option ids
  is_correct        INTEGER NOT NULL DEFAULT 0,
  points_earned     INTEGER NOT NULL DEFAULT 0,
  response_time_ms  INTEGER NOT NULL DEFAULT 0,
  submitted_at      INTEGER NOT NULL,
  UNIQUE(session_id, player_id, question_id)                -- prevent duplicate submissions
);

CREATE INDEX IF NOT EXISTS idx_submissions_session  ON submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_submissions_player   ON submissions(player_id);
CREATE INDEX IF NOT EXISTS idx_submissions_question ON submissions(question_id);

-- ─── Final results ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS results (
  id          TEXT    PRIMARY KEY,
  session_id  TEXT    NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  player_id   TEXT    NOT NULL REFERENCES session_players(id) ON DELETE CASCADE,
  final_score INTEGER NOT NULL DEFAULT 0,
  final_rank  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  UNIQUE(session_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_results_session ON results(session_id);

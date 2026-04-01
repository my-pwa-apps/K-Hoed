-- migration: 0003_question_types
-- Add new question types (typeanswer, slider, puzzle, pinanswer) and a config column.
-- SQLite doesn't support ALTER CONSTRAINT, so we recreate the questions table.

PRAGMA foreign_keys = OFF;

CREATE TABLE questions_new (
  id          TEXT    PRIMARY KEY,
  quiz_id     TEXT    NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  text        TEXT    NOT NULL,
  image_url   TEXT,
  type        TEXT    NOT NULL CHECK(type IN (
                'classic', 'multiple', 'truefalse',
                'typeanswer', 'slider', 'puzzle', 'pinanswer'
              )),
  time_limit  INTEGER NOT NULL DEFAULT 20,
  points      INTEGER NOT NULL DEFAULT 1000,
  order_index INTEGER NOT NULL,
  config      TEXT,
  created_at  INTEGER NOT NULL
);

INSERT INTO questions_new
  SELECT id, quiz_id, text, image_url, type, time_limit, points, order_index, NULL, created_at
  FROM questions;

DROP TABLE questions;
ALTER TABLE questions_new RENAME TO questions;

CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id, order_index);

PRAGMA foreign_keys = ON;

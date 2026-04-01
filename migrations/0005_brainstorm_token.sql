-- migration: 0005_brainstorm_token
-- Adds a per-quiz invite token for collaborative brainstorming (no auth required for collaborators)

PRAGMA foreign_keys = ON;

ALTER TABLE quizzes ADD COLUMN brainstorm_token TEXT;
CREATE UNIQUE INDEX idx_quizzes_brainstorm_token ON quizzes (brainstorm_token)
  WHERE brainstorm_token IS NOT NULL;

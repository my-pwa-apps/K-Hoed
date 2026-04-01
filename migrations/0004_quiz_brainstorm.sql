-- migration: 0004_quiz_brainstorm

PRAGMA foreign_keys = ON;

ALTER TABLE quizzes ADD COLUMN brainstorm TEXT;
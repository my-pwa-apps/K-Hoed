-- migration: 0002_seed
-- Sample data for local development.  Do NOT run on production.

-- Demo host user: email = demo@khoed.dev  password = demo1234
-- Password hash is PBKDF2-SHA256 of "demo1234" with a fixed salt — regenerate for production.
INSERT OR IGNORE INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES
  (
    'usr_demo_0001',
    'demo@khoed.dev',
    'Demo Host',
    -- This is a placeholder; run `npm run db:create-demo-user` or register via the UI.
    'PLACEHOLDER_RUN_REGISTER_API',
    1700000000000,
    1700000000000
  );

-- ─── Sample quiz: "General Knowledge" ────────────────────────────────────────

INSERT OR IGNORE INTO quizzes (id, title, description, owner_id, is_public, created_at, updated_at) VALUES
  ('quiz_gk_0001', 'General Knowledge', 'A classic trivia quiz to get the party started!', 'usr_demo_0001', 1, 1700000000000, 1700000000000);

-- Question 1 — Classic
INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_gk_001', 'quiz_gk_0001', 'What is the capital of France?', 'classic', 20, 1000, 0, 1700000000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_gk_001_a', 'q_gk_001', 'Berlin',    0, 0),
  ('ao_gk_001_b', 'q_gk_001', 'Madrid',    0, 1),
  ('ao_gk_001_c', 'q_gk_001', 'Paris',     1, 2),
  ('ao_gk_001_d', 'q_gk_001', 'Amsterdam', 0, 3);

-- Question 2 — True/False
INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_gk_002', 'quiz_gk_0001', 'The Great Wall of China is visible from space with the naked eye.', 'truefalse', 15, 1000, 1, 1700000000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_gk_002_a', 'q_gk_002', 'True',  0, 0),
  ('ao_gk_002_b', 'q_gk_002', 'False', 1, 1);

-- Question 3 — Classic
INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_gk_003', 'quiz_gk_0001', 'How many planets are in our Solar System?', 'classic', 20, 1000, 2, 1700000000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_gk_003_a', 'q_gk_003', '7', 0, 0),
  ('ao_gk_003_b', 'q_gk_003', '8', 1, 1),
  ('ao_gk_003_c', 'q_gk_003', '9', 0, 2),
  ('ao_gk_003_d', 'q_gk_003', '10', 0, 3);

-- Question 4 — Multiple correct
INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_gk_004', 'quiz_gk_0001', 'Which of the following are programming languages?', 'multiple', 25, 1000, 3, 1700000000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_gk_004_a', 'q_gk_004', 'Python',     1, 0),
  ('ao_gk_004_b', 'q_gk_004', 'HTML',       0, 1),
  ('ao_gk_004_c', 'q_gk_004', 'TypeScript', 1, 2),
  ('ao_gk_004_d', 'q_gk_004', 'Markdown',   0, 3);

-- Question 5 — Classic
INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_gk_005', 'quiz_gk_0001', 'Which element has the chemical symbol "Au"?', 'classic', 20, 1000, 4, 1700000000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_gk_005_a', 'q_gk_005', 'Silver',   0, 0),
  ('ao_gk_005_b', 'q_gk_005', 'Gold',     1, 1),
  ('ao_gk_005_c', 'q_gk_005', 'Copper',   0, 2),
  ('ao_gk_005_d', 'q_gk_005', 'Platinum', 0, 3);

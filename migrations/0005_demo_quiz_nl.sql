-- migration: 0005_demo_quiz_nl
-- 1. Expands the questions.type CHECK constraint to include audioclip + videoclip.
-- 2. Seeds a Dutch demo quiz ("K-Hoed Demo Quiz") that covers all nine question types.

PRAGMA foreign_keys = OFF;

-- ── Recreate questions table with expanded type constraint ───────────────────

CREATE TABLE IF NOT EXISTS questions_v5 (
  id          TEXT    PRIMARY KEY,
  quiz_id     TEXT    NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  text        TEXT    NOT NULL,
  image_url   TEXT,
  type        TEXT    NOT NULL CHECK(type IN (
                'classic', 'multiple', 'truefalse',
                'typeanswer', 'slider', 'puzzle', 'pinanswer',
                'audioclip', 'videoclip'
              )),
  time_limit  INTEGER NOT NULL DEFAULT 20,
  points      INTEGER NOT NULL DEFAULT 1000,
  order_index INTEGER NOT NULL,
  config      TEXT,
  created_at  INTEGER NOT NULL
);

INSERT INTO questions_v5
  SELECT id, quiz_id, text, image_url, type, time_limit, points, order_index, config, created_at
  FROM questions;

DROP TABLE questions;
ALTER TABLE questions_v5 RENAME TO questions;

CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id, order_index);

PRAGMA foreign_keys = ON;

-- ── Demo quiz record ─────────────────────────────────────────────────────────

INSERT OR IGNORE INTO quizzes (id, title, description, owner_id, is_public, created_at, updated_at) VALUES (
  '7a2b4c89-6395-473e-b9c2-88ee5f2fa759',
  'K-Hoed Demo Quiz 🎩',
  'Een demoquiz om alle vraagtypes te laten zien — van klassiek meerkeuzevraag tot songclip!',
  'usr_demo_0001',
  1,
  1743500000000,
  1743500000000
);

-- ── Q0 · classic ─────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_00', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759', 'Wat is de hoofdstad van Nederland?', 'classic', 15, 1000, 0, 1743500000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_d00a', 'q_demo_00', 'Rotterdam',  0, 0),
  ('ao_d00b', 'q_demo_00', 'Den Haag',   0, 1),
  ('ao_d00c', 'q_demo_00', 'Amsterdam',  1, 2),
  ('ao_d00d', 'q_demo_00', 'Utrecht',    0, 3);

-- ── Q1 · classic ─────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_01', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759', 'Welke kleur heeft de BOVENSTE strook van de Nederlandse vlag?', 'classic', 15, 1000, 1, 1743500000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_d01a', 'q_demo_01', 'Blauw',   0, 0),
  ('ao_d01b', 'q_demo_01', 'Wit',     0, 1),
  ('ao_d01c', 'q_demo_01', 'Oranje',  0, 2),
  ('ao_d01d', 'q_demo_01', 'Rood',    1, 3);

-- ── Q2 · multiple ────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_02', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759', 'Welke steden liggen in de provincie Noord-Holland? (meerdere antwoorden)', 'multiple', 25, 1000, 2, 1743500000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_d02a', 'q_demo_02', 'Amsterdam', 1, 0),
  ('ao_d02b', 'q_demo_02', 'Haarlem',   1, 1),
  ('ao_d02c', 'q_demo_02', 'Leiden',    0, 2),
  ('ao_d02d', 'q_demo_02', 'Utrecht',   0, 3);

-- ── Q3 · multiple ────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_03', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759', 'Welke landen grenzen aan Nederland? (meerdere antwoorden)', 'multiple', 25, 1000, 3, 1743500000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_d03a', 'q_demo_03', 'Duitsland',  1, 0),
  ('ao_d03b', 'q_demo_03', 'België',     1, 1),
  ('ao_d03c', 'q_demo_03', 'Luxemburg',  0, 2),
  ('ao_d03d', 'q_demo_03', 'Denemarken', 0, 3);

-- ── Q4 · truefalse ───────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_04', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759', 'Nederland heeft meer fietsen dan inwoners.', 'truefalse', 15, 1000, 4, 1743500000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_d04a', 'q_demo_04', 'True',  1, 0),
  ('ao_d04b', 'q_demo_04', 'False', 0, 1);

-- ── Q5 · truefalse ───────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_05', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759', 'De Eiffeltoren staat in Amsterdam.', 'truefalse', 10, 1000, 5, 1743500000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_d05a', 'q_demo_05', 'True',  0, 0),
  ('ao_d05b', 'q_demo_05', 'False', 1, 1);

-- ── Q6 · typeanswer ──────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_06', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759', 'Wie schreef het beroemde dagboek "Het Achterhuis"?', 'typeanswer', 30, 1000, 6, 1743500000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_d06a', 'q_demo_06', 'Anne Frank',     1, 0),
  ('ao_d06b', 'q_demo_06', 'Anne',           1, 1),
  ('ao_d06c', 'q_demo_06', 'Annelies Frank', 1, 2);

-- ── Q7 · typeanswer ──────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_07', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759', 'Welk dier staat centraal op het Nederlandse staatswapen?', 'typeanswer', 20, 1000, 7, 1743500000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_d07a', 'q_demo_07', 'Leeuw',     1, 0),
  ('ao_d07b', 'q_demo_07', 'De leeuw',  1, 1),
  ('ao_d07c', 'q_demo_07', 'Een leeuw', 1, 2);

-- ── Q8 · slider ──────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, config, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_08', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759', 'Hoeveel provincies heeft Nederland?',
   '{"min":1,"max":20,"step":1,"correct":12,"tolerance":1}',
   'slider', 20, 1000, 8, 1743500000000);

-- ── Q9 · slider ──────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, config, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_09', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759', 'De Eiffeltoren is ruwweg ___ meter hoog.',
   '{"min":100,"max":600,"step":10,"correct":330,"tolerance":30}',
   'slider', 25, 1000, 9, 1743500000000);

-- ── Q10 · puzzle ─────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_10', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759', 'Zet de Nederlandse koninginnen en koningen op volgorde (vroegst → recentst):', 'puzzle', 35, 1000, 10, 1743500000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_d10a', 'q_demo_10', 'Koningin Wilhelmina',     1, 0),
  ('ao_d10b', 'q_demo_10', 'Koningin Juliana',        1, 1),
  ('ao_d10c', 'q_demo_10', 'Koningin Beatrix',        1, 2),
  ('ao_d10d', 'q_demo_10', 'Koning Willem-Alexander', 1, 3);

-- ── Q11 · puzzle ─────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_11', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759', 'Zet deze Nederlandse steden op volgorde van bevolkingsgrootte (groot → klein):', 'puzzle', 30, 1000, 11, 1743500000000);

INSERT OR IGNORE INTO answer_options (id, question_id, text, is_correct, order_index) VALUES
  ('ao_d11a', 'q_demo_11', 'Amsterdam', 1, 0),
  ('ao_d11b', 'q_demo_11', 'Rotterdam', 1, 1),
  ('ao_d11c', 'q_demo_11', 'Den Haag',  1, 2),
  ('ao_d11d', 'q_demo_11', 'Utrecht',   1, 3);

-- ── Q12 · pinanswer ──────────────────────────────────────────────────────────
-- Hotspot: blue stripe = bottom third of Dutch flag → y ≈ 0.836

INSERT OR IGNORE INTO questions (id, quiz_id, text, image_url, config, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_12', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759',
   'Klik op de BLAUWE strook van de Nederlandse vlag.',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Flag_of_the_Netherlands.svg/600px-Flag_of_the_Netherlands.svg.png',
   '{"hotspotX":0.5,"hotspotY":0.836,"hotspotRadius":0.14}',
   'pinanswer', 20, 1000, 12, 1743500000000);

-- ── Q13 · pinanswer ──────────────────────────────────────────────────────────
-- Hotspot: Netherlands on orthographic Europe map → x≈0.466, y≈0.34

INSERT OR IGNORE INTO questions (id, quiz_id, text, image_url, config, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_13', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759',
   'Klik op de locatie van Nederland op deze kaart van Europa.',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Europe_orthographic_Caucasus_Urals_boundary_%28with_borders%29.svg/600px-Europe_orthographic_Caucasus_Urals_boundary_%28with_borders%29.svg.png',
   '{"hotspotX":0.466,"hotspotY":0.34,"hotspotRadius":0.06}',
   'pinanswer', 25, 1000, 13, 1743500000000);

-- ── Q14 · audioclip ──────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, config, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_14', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759',
   'Van welk nummer is dit een fragment? (titel + artiest = bonuspunten!)',
   '{"mediaUrl":"https://www.youtube.com/watch?v=fJ9rUzIMcZQ","songTitle":"Bohemian Rhapsody","songArtist":"Queen","artistPoints":500}',
   'audioclip', 45, 1000, 14, 1743500000000);

-- ── Q15 · audioclip ──────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, config, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_15', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759',
   'Herken jij dit wereldhit? (titel + artiest voor extra punten!)',
   '{"mediaUrl":"https://www.youtube.com/watch?v=9bZkp7q19f0","songTitle":"Gangnam Style","songArtist":"PSY","artistPoints":500}',
   'audioclip', 45, 1000, 15, 1743500000000);

-- ── Q16 · videoclip ──────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, config, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_16', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759',
   'Uit welke film is deze trailer?',
   '{"mediaUrl":"https://www.youtube.com/watch?v=lc0UehYemQA","songTitle":"Jurassic Park"}',
   'videoclip', 45, 1000, 16, 1743500000000);

-- ── Q17 · videoclip ──────────────────────────────────────────────────────────

INSERT OR IGNORE INTO questions (id, quiz_id, text, config, type, time_limit, points, order_index, created_at) VALUES
  ('q_demo_17', '7a2b4c89-6395-473e-b9c2-88ee5f2fa759',
   'Welke film herken jij in deze trailer?',
   '{"mediaUrl":"https://www.youtube.com/watch?v=2e-eXJ6HgkQ","songTitle":"Titanic"}',
   'videoclip', 45, 1000, 17, 1743500000000);

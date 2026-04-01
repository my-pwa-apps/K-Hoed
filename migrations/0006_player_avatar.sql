-- Add avatar_emoji column to session_players
ALTER TABLE session_players ADD COLUMN avatar_emoji TEXT NOT NULL DEFAULT '';

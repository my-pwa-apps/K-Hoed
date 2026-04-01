/**
 * Lightweight profanity filter.  A real deployment should use a fuller word-list
 * or a moderation API;  this list is intentionally minimal for the scaffold.
 */
const BLOCKED = new Set([
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "cunt",
  "bastard",
  "dick",
  "cock",
  "pussy",
  "faggot",
  "nigger",
  "nigga",
]);

/** Collapse consecutive repeated letters: "fuuuck" → "fuck", "shiiit" → "shit" */
function dedup(s: string): string {
  return s.replace(/(.)(\1+)/g, "$1");
}

/** Returns true if the string contains a blocked word. */
export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();

  // 1. Whole-word check (handles normal usage and punctuation-separated like f.u.c.k)
  const words = lower.replace(/[^a-z0-9 ]/g, "").split(/\s+/);
  for (const word of words) {
    if (BLOCKED.has(word) || BLOCKED.has(dedup(word))) return true;
  }

  // 2. Strip ALL non-alpha chars (catches "f.u.c.k", "f u c k", "fuuck")
  const stripped = dedup(lower.replace(/[^a-z]/g, ""));
  if (BLOCKED.has(stripped)) return true;

  // 3. Substring check on fully stripped+deduped string for short words (≤5 chars)
  for (const word of BLOCKED) {
    if (word.length <= 5 && stripped.includes(word)) return true;
  }

  return false;
}

/** Redacts blocked words with asterisks. */
export function redactProfanity(text: string): string {
  let result = text;
  for (const word of BLOCKED) {
    const re = new RegExp(`\\b${word}\\b`, "gi");
    result = result.replace(re, "*".repeat(word.length));
  }
  return result;
}

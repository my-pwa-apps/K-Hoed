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

/** Returns true if the string contains a blocked word. */
export function containsProfanity(text: string): boolean {
  const normalised = text.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  for (const word of normalised.split(/\s+/)) {
    if (BLOCKED.has(word)) return true;
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

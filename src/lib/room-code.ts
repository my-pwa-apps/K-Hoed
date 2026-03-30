/** Generates a human-readable 6-character room code using uppercase letters & digits. */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusable chars (0/O, 1/I)
  let code = "";
  const random = crypto.getRandomValues(new Uint8Array(6));
  for (const byte of random) {
    code += chars[byte % chars.length];
  }
  return code;
}

/** Cryptographically random UUID v4 without depending on Node. */
export function newId(): string {
  return crypto.randomUUID();
}

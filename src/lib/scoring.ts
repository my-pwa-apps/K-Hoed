/**
 * Scoring constants and pure calculation functions.
 * All scoring logic lives here so it can be tested in isolation.
 */

export const SCORING = {
  /** Default base points per correct answer */
  BASE_POINTS: 1000,
  /** Minimum fraction of base points for a slow-but-correct answer */
  MIN_FRACTION: 0.5,
  /** Milliseconds of grace window for very fast answers */
  GRACE_MS: 200,
  /** Reconnect window: player identity preserved if they return within this */
  RECONNECT_WINDOW_MS: 5 * 60_000,
} as const;

/**
 * Calculate points earned for a single answer submission.
 *
 * @param basePoints   - Configured points for the question
 * @param timeLimitSec - Question time limit in seconds
 * @param responseMs   - Time taken by the player in milliseconds
 * @param correct      - Whether the submitted answer(s) are correct
 */
export function calculateScore(
  basePoints: number,
  timeLimitSec: number,
  responseMs: number,
  correct: boolean,
): number {
  if (!correct) return 0;

  const timeLimitMs = timeLimitSec * 1000;
  // Clamp: answers before grace window get full time bonus
  const clampedMs = Math.max(0, responseMs - SCORING.GRACE_MS);
  const fraction = Math.max(0, 1 - clampedMs / timeLimitMs);
  // Score is between MIN_FRACTION and 1.0 of base points, rounded to nearest int
  const multiplier = SCORING.MIN_FRACTION + (1 - SCORING.MIN_FRACTION) * fraction;
  return Math.round(basePoints * multiplier);
}

/**
 * Evaluate an audioclip answer.
 * Returns { isCorrect, bonusPoints } where isCorrect = title correct.
 */
export function evaluateAudioClip(
  titleAnswer: string,
  artistAnswer: string | undefined,
  config: import("../types/index.js").MediaClipConfig,
): { isCorrect: boolean; bonusPoints: number } {
  const isCorrect = config.songTitle
    ? evaluateTypeanswer(titleAnswer, [config.songTitle])
    : false;
  const bonusPoints =
    isCorrect &&
    config.songArtist &&
    artistAnswer &&
    evaluateTypeanswer(artistAnswer, [config.songArtist])
      ? (config.artistPoints ?? 500)
      : 0;
  return { isCorrect, bonusPoints };
}

/**
 * Evaluate a videoclip answer (title of movie/series).
 */
export function evaluateVideoClip(
  titleAnswer: string,
  config: import("../types/index.js").MediaClipConfig,
): boolean {
  const accepted = [
    ...(config.videoTitle ? [config.videoTitle] : []),
    ...(config.songTitle ? [config.songTitle] : []),
  ];
  return accepted.length > 0 ? evaluateTypeanswer(titleAnswer, accepted) : false;
}

/**
 * Build a sorted leaderboard from a map of playerId → cumulative score.
 * Returns entries with 1-based rank and delta (points won on this question).
 */
export function buildLeaderboard(
  players: Array<{ id: string; displayName: string; avatarEmoji: string; score: number }>,
  prevScores: Map<string, number>,
): import("../types/index.js").LeaderboardEntry[] {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return sorted.map((p, i) => ({
    playerId: p.id,
    displayName: p.displayName,
    avatarEmoji: p.avatarEmoji,
    score: p.score,
    rank: i + 1,
    delta: p.score - (prevScores.get(p.id) ?? 0),
  }));
}

/**
 * Determine if all answer submissions are correct for a given question type.
 * For "multiple" type, every correct option must be selected and no wrong ones.
 */
export function evaluateAnswer(
  submittedIds: string[],
  correctIds: string[],
  type: import("../types/index.js").QuestionType,
): boolean {
  const submitted = new Set(submittedIds);
  const correct = new Set(correctIds);

  if (type === "classic" || type === "truefalse") {
    // Exactly one answer required, must match the single correct answer
    if (submitted.size !== 1) return false;
    const [only] = submitted;
    return correct.has(only!);
  }

  if (type === "multiple") {
    // Must select ALL correct and NO incorrect options
    if (submitted.size !== correct.size) return false;
    for (const id of submitted) {
      if (!correct.has(id)) return false;
    }
    return true;
  }

  return false;
}

/**
 * Evaluate a free-text answer against a set of acceptable correct texts.
 * Comparison is case-insensitive and trims surrounding whitespace.
 */
export function evaluateTypeanswer(submitted: string, correctTexts: string[]): boolean {
  const normalized = submitted.trim().toLowerCase();
  if (!normalized) return false;
  return correctTexts.some((t) => t.trim().toLowerCase() === normalized);
}

/**
 * Evaluate a slider value against the configured correct value + tolerance.
 */
export function evaluateSlider(
  value: number,
  config: import("../types/index.js").SliderConfig,
): boolean {
  return Math.abs(value - config.correct) <= config.tolerance;
}

/**
 * Evaluate a puzzle submission: the submitted ID order must exactly match
 * the correct order (determined by order_index on the server).
 */
export function evaluatePuzzle(submittedOrder: string[], correctOrder: string[]): boolean {
  if (submittedOrder.length !== correctOrder.length) return false;
  return submittedOrder.every((id, i) => id === correctOrder[i]);
}

/**
 * Evaluate a pin answer: the clicked point must be within the hotspot circle.
 * All coordinates are 0-1 normalised fractions of image dimensions.
 */
export function evaluatePinanswer(
  coords: { x: number; y: number },
  config: import("../types/index.js").PinAnswerConfig,
): boolean {
  const dx = coords.x - config.hotspotX;
  const dy = coords.y - config.hotspotY;
  return Math.sqrt(dx * dx + dy * dy) <= config.hotspotRadius;
}

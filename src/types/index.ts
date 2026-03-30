// ─── Domain enumerations ─────────────────────────────────────────────────────

export type QuestionType = "classic" | "multiple" | "truefalse";
export type GameStatus = "lobby" | "active" | "ended";
export type RoomPhase = "lobby" | "question" | "revealing" | "leaderboard" | "ended";

// ─── Database row shapes ──────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
}

export interface QuizRow {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  is_public: number; // 0 | 1 (SQLite bool)
  created_at: number;
  updated_at: number;
}

export interface QuestionRow {
  id: string;
  quiz_id: string;
  text: string;
  image_url: string | null;
  type: QuestionType;
  time_limit: number;
  points: number;
  order_index: number;
  created_at: number;
}

export interface AnswerOptionRow {
  id: string;
  question_id: string;
  text: string;
  is_correct: number; // 0 | 1
  order_index: number;
}

export interface QuizSessionRow {
  id: string;
  quiz_id: string;
  host_id: string;
  room_code: string;
  status: GameStatus;
  started_at: number | null;
  ended_at: number | null;
  created_at: number;
}

export interface SessionPlayerRow {
  id: string;
  session_id: string;
  display_name: string;
  score: number;
  joined_at: number;
}

export interface SubmissionRow {
  id: string;
  session_id: string;
  player_id: string;
  question_id: string;
  answer_option_ids: string; // JSON array
  is_correct: number; // 0 | 1
  points_earned: number;
  response_time_ms: number;
  submitted_at: number;
}

export interface ResultRow {
  id: string;
  session_id: string;
  player_id: string;
  final_score: number;
  final_rank: number;
  created_at: number;
}

// ─── Enriched / joined shapes ─────────────────────────────────────────────────

export interface AnswerOption {
  id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
}

export interface QuestionWithAnswers {
  id: string;
  quiz_id: string;
  text: string;
  image_url: string | null;
  type: QuestionType;
  time_limit: number;
  points: number;
  order_index: number;
  answer_options: AnswerOption[];
}

export interface QuizWithQuestions {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  is_public: boolean;
  created_at: number;
  updated_at: number;
  questions: QuestionWithAnswers[];
}

// ─── Durable Object in-memory state ──────────────────────────────────────────

export interface PlayerInMemory {
  id: string;
  displayName: string;
  score: number;
  connected: boolean;
  /** Whether this player is the reconnecting placeholder waiting for WS */
  disconnectedAt: number | null;
}

export interface SubmissionInMemory {
  playerId: string;
  answerIds: string[];
  responseTimeMs: number;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  score: number;
  rank: number;
  delta: number; // points gained on last question
}

// ─── WebSocket message protocol ───────────────────────────────────────────────

// Client → Server
export type ClientMessage =
  | { type: "host_join"; sessionId: string; authToken: string }
  | {
      type: "player_join";
      displayName: string;
      sessionId: string;
      /** Re-supply on reconnect to reclaim prior identity */
      playerId?: string;
    }
  | {
      type: "submit_answer";
      questionId: string;
      answerIds: string[];
      /** Client-side timestamp for anti-cheat cross-check */
      clientTimestamp: number;
    }
  | { type: "start_game" }
  | { type: "next_question" }
  | { type: "show_leaderboard" }
  | { type: "end_game" }
  | { type: "kick_player"; playerId: string }
  | { type: "pong" };

// Server → Client
export type ServerMessage =
  | {
      type: "room_state";
      phase: RoomPhase;
      playerCount: number;
      players?: PlayerSnapshot[];
      currentQuestionIndex: number;
    }
  | { type: "player_joined"; player: PlayerSnapshot }
  | { type: "player_left"; playerId: string; displayName: string }
  | { type: "game_started" }
  | {
      type: "question_start";
      question: QuestionPayload;
      questionIndex: number;
      totalQuestions: number;
      startTime: number;
      timeLimit: number;
    }
  | { type: "answer_received"; answerCount: number; totalPlayers: number }
  | {
      type: "question_end";
      correctAnswerIds: string[];
      distribution: Record<string, number>;
    }
  | {
      type: "answer_result";
      correct: boolean;
      pointsEarned: number;
      totalScore: number;
    }
  | { type: "leaderboard"; entries: LeaderboardEntry[]; questionIndex: number }
  | { type: "game_ended"; finalLeaderboard: LeaderboardEntry[] }
  | { type: "error"; message: string; code?: string }
  | { type: "kicked"; reason?: string }
  | { type: "ping" };

export interface PlayerSnapshot {
  id: string;
  displayName: string;
  score: number;
  connected: boolean;
}

/** Question payload sent to players (no is_correct field) */
export interface QuestionPayload {
  id: string;
  text: string;
  imageUrl: string | null;
  type: QuestionType;
  answerOptions: { id: string; text: string }[];
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string; // user id
  email: string;
  display_name: string;
  iat: number;
  exp: number;
}

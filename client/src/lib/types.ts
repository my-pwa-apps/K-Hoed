// ─── Domain types mirroring the worker ───────────────────────────────────────

export type QuestionType = "classic" | "multiple" | "truefalse";
export type GameStatus = "lobby" | "active" | "ended";
export type RoomPhase = "lobby" | "question" | "revealing" | "leaderboard" | "ended";

export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at?: number;
}

export interface AnswerOption {
  id?: string; // absent when creating a new option
  text: string;
  is_correct: boolean;
  order_index: number;
}

export interface Question {
  id?: string; // absent when creating a new question
  quiz_id?: string; // populated by server; not present when building locally
  text: string;
  image_url: string | null;
  type: QuestionType;
  time_limit: number;
  points: number;
  order_index: number;
  answer_options: AnswerOption[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  is_public: boolean;
  created_at: number;
  updated_at: number;
  question_count?: number;
  questions?: Question[];
}

export interface QuizSession {
  id: string;
  quiz_id: string;
  host_id: string;
  room_code: string;
  status: GameStatus;
  started_at: number | null;
  ended_at: number | null;
  created_at: number;
}

export interface SessionPlayer {
  id: string;
  session_id: string;
  display_name: string;
  score: number;
  joined_at: number;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  score: number;
  rank: number;
  delta: number;
}

export interface PlayerSnapshot {
  id: string;
  displayName: string;
  score: number;
  connected: boolean;
}

export interface QuestionPayload {
  id: string;
  text: string;
  imageUrl: string | null;
  type: QuestionType;
  answerOptions: { id: string; text: string }[];
}

// ─── WebSocket message protocol (client side) ─────────────────────────────────

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

export type ClientMessage =
  | { type: "host_join"; sessionId: string; authToken: string }
  | {
      type: "player_join";
      displayName: string;
      sessionId: string;
      playerId?: string;
    }
  | {
      type: "submit_answer";
      questionId: string;
      answerIds: string[];
      clientTimestamp: number;
    }
  | { type: "start_game" }
  | { type: "next_question" }
  | { type: "show_leaderboard" }
  | { type: "end_game" }
  | { type: "kick_player"; playerId: string }
  | { type: "pong" };

// ─── API response wrapper ──────────────────────────────────────────────────────

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

// ─── Domain types mirroring the worker ───────────────────────────────────────

export type QuestionType =
  | "classic"
  | "multiple"
  | "truefalse"
  | "typeanswer"
  | "slider"
  | "puzzle"
  | "pinanswer"
  | "audioclip"
  | "videoclip";
export type GameStatus = "lobby" | "active" | "ended";
export type RoomPhase = "lobby" | "question" | "revealing" | "leaderboard" | "ended";

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  correct: number;
  tolerance: number;
}

export interface PinAnswerConfig {
  hotspotX: number;
  hotspotY: number;
  hotspotRadius: number;
}

export interface MediaClipConfig {
  mediaUrl: string;
  songTitle?: string;
  songArtist?: string;
  artistPoints?: number;
  videoTitle?: string;
}

export type QuestionConfig = SliderConfig | PinAnswerConfig | MediaClipConfig | null;

export type BrainstormStatus = "proposed" | "shortlisted" | "added";

export interface BrainstormItem {
  id: string;
  text: string;
  notes: string | null;
  suggested_by: string | null;
  status: BrainstormStatus;
}

export interface RevealData {
  type: QuestionType;
  correctTexts?: string[];
  sliderCorrect?: number;
  sliderTolerance?: number;
  pinHotspot?: { x: number; y: number; radius: number };
}

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
  config?: QuestionConfig;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  is_public: boolean;
  brainstorm?: BrainstormItem[];
  brainstorm_token?: string | null;
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
  avatar_emoji: string;
  score: number;
  joined_at: number;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  avatarEmoji?: string;
  score: number;
  rank: number;
  delta: number;
}

export interface PlayerSnapshot {
  id: string;
  displayName: string;
  avatarEmoji?: string;
  score: number;
  connected: boolean;
}

export interface QuestionPayload {
  id: string;
  text: string;
  imageUrl: string | null;
  type: QuestionType;
  answerOptions: { id: string; text: string }[];
  sliderConfig?: { min: number; max: number; step: number };
  /** For audioclip / videoclip */
  mediaUrl?: string;
  hasArtist?: boolean;
  artistPoints?: number;
}

// ─── WebSocket message protocol (client side) ─────────────────────────────────

export type ServerMessage =
  | {
      type: "room_state";
      phase: RoomPhase;
      playerCount: number;
      players?: PlayerSnapshot[];
      currentQuestionIndex: number;
      /** Restored score for reconnecting player */
      totalScore?: number;
      /** Restored leaderboard for reconnecting player in leaderboard/ended phase */
      leaderboard?: LeaderboardEntry[];
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
      revealData?: RevealData;
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
  | { type: "ping" }
  | { type: "reaction"; playerId: string; displayName: string; avatarEmoji?: string; gifUrl: string; caption?: string };

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
      answerIds?: string[];
      answerText?: string;
      answerText2?: string;  // audioclip artist (bonus)
      sliderValue?: number;
      pinCoords?: { x: number; y: number };
      clientTimestamp: number;
    }
  | { type: "start_game" }
  | { type: "next_question" }
  | { type: "show_leaderboard" }
  | { type: "force_reveal" }  // host skips remaining timer
  | { type: "end_game" }
  | { type: "kick_player"; playerId: string }
  | { type: "pong" }
  | { type: "send_reaction"; gifUrl: string; caption?: string };

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

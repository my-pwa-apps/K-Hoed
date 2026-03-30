import { create } from "zustand";
import type {
  RoomPhase,
  PlayerSnapshot,
  QuestionPayload,
  LeaderboardEntry,
  ServerMessage,
} from "@/lib/types";

interface HostState {
  role: "host";
  phase: RoomPhase;
  players: PlayerSnapshot[];
  currentQuestion: QuestionPayload | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartTime: number;
  timeLimit: number;
  distribution: Record<string, number>;
  correctAnswerIds: string[];
  leaderboard: LeaderboardEntry[];
  answerCount: number;
}

interface PlayerState {
  role: "player";
  playerId: string;
  displayName: string;
  phase: RoomPhase;
  currentQuestion: QuestionPayload | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartTime: number;
  timeLimit: number;
  selectedAnswerIds: string[];
  answerSubmitted: boolean;
  lastResult: { correct: boolean; pointsEarned: number; totalScore: number } | null;
  leaderboard: LeaderboardEntry[];
  totalScore: number;
}

type GameState = (HostState | PlayerState) & {
  sessionId: string;
  roomCode: string;
  applyMessage: (msg: ServerMessage) => void;
  reset: () => void;
  // Player-specific mutations
  selectAnswer: (answerId: string) => void;
  clearAnswerSelection: () => void;
};

const EMPTY_HOST: HostState = {
  role: "host",
  phase: "lobby",
  players: [],
  currentQuestion: null,
  currentQuestionIndex: -1,
  totalQuestions: 0,
  questionStartTime: 0,
  timeLimit: 20,
  distribution: {},
  correctAnswerIds: [],
  leaderboard: [],
  answerCount: 0,
};

const EMPTY_PLAYER: PlayerState = {
  role: "player",
  playerId: "",
  displayName: "",
  phase: "lobby",
  currentQuestion: null,
  currentQuestionIndex: -1,
  totalQuestions: 0,
  questionStartTime: 0,
  timeLimit: 20,
  selectedAnswerIds: [],
  answerSubmitted: false,
  lastResult: null,
  leaderboard: [],
  totalScore: 0,
};

export const useGameStore = create<GameState>()((set, get) => ({
  ...EMPTY_HOST,
  sessionId: "",
  roomCode: "",

  reset: () =>
    set({
      ...EMPTY_HOST,
      sessionId: "",
      roomCode: "",
    }),

  selectAnswer: (answerId) => {
    const state = get();
    if (state.role !== "player") return;
    const q = state.currentQuestion;
    if (!q) return;

    if (q.type === "classic" || q.type === "truefalse") {
      set({ selectedAnswerIds: [answerId] } as Partial<GameState>);
    } else {
      // Toggle for multiple-select
      const current = state.selectedAnswerIds;
      const next = current.includes(answerId)
        ? current.filter((id) => id !== answerId)
        : [...current, answerId];
      set({ selectedAnswerIds: next } as Partial<GameState>);
    }
  },

  clearAnswerSelection: () => {
    set({ selectedAnswerIds: [], answerSubmitted: false } as Partial<GameState>);
  },

  applyMessage: (msg: ServerMessage) => {
    set((prev) => applyServerMessage(prev as GameState, msg));
  },
}));

function applyServerMessage(prev: GameState, msg: ServerMessage): Partial<GameState> {
  switch (msg.type) {
    case "room_state":
      if (prev.role === "host") {
        return {
          phase: msg.phase,
          players: msg.players ?? prev.players,
          currentQuestionIndex: msg.currentQuestionIndex,
        };
      }
      return {
        phase: msg.phase,
        currentQuestionIndex: msg.currentQuestionIndex,
      };

    case "player_joined":
      if (prev.role !== "host") return {};
      return {
        players: [...prev.players.filter((p) => p.id !== msg.player.id), msg.player],
      };

    case "player_left":
      if (prev.role !== "host") return {};
      return {
        players: prev.players.map((p) =>
          p.id === msg.playerId ? { ...p, connected: false } : p,
        ),
      };

    case "game_started":
      return { phase: "question" as RoomPhase };

    case "question_start": {
      const base = {
        phase: "question" as RoomPhase,
        currentQuestion: msg.question,
        currentQuestionIndex: msg.questionIndex,
        totalQuestions: msg.totalQuestions,
        questionStartTime: msg.startTime,
        timeLimit: msg.timeLimit,
      };
      if (prev.role === "host") {
        return { ...base, distribution: {}, correctAnswerIds: [], answerCount: 0 };
      }
      return {
        ...base,
        selectedAnswerIds: [],
        answerSubmitted: false,
        lastResult: null,
      };
    }

    case "answer_received":
      if (prev.role !== "host") return {};
      return { answerCount: msg.answerCount };

    case "question_end":
      return {
        phase: "revealing" as RoomPhase,
        correctAnswerIds: msg.correctAnswerIds,
        distribution: msg.distribution,
      };

    case "answer_result":
      if (prev.role !== "player") return {};
      return {
        lastResult: {
          correct: msg.correct,
          pointsEarned: msg.pointsEarned,
          totalScore: msg.totalScore,
        },
        totalScore: msg.totalScore,
        answerSubmitted: true,
        phase: "revealing" as RoomPhase,
      };

    case "leaderboard":
      return { phase: "leaderboard" as RoomPhase, leaderboard: msg.entries };

    case "game_ended":
      return { phase: "ended" as RoomPhase, leaderboard: msg.finalLeaderboard };

    default:
      return {};
  }
}

/** Initialise game store for a host session */
export function initHostGame(sessionId: string, roomCode: string) {
  useGameStore.setState({
    ...EMPTY_HOST,
    sessionId,
    roomCode,
  });
}

/** Initialise game store for a player session */
export function initPlayerGame(
  sessionId: string,
  roomCode: string,
  playerId: string,
  displayName: string,
) {
  useGameStore.setState({
    ...EMPTY_PLAYER,
    role: "player",
    sessionId,
    roomCode,
    playerId,
    displayName,
  });
}

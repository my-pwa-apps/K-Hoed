import { create } from "zustand";
const EMPTY_HOST = {
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
    revealData: null,
    leaderboard: [],
    answerCount: 0,
};
const EMPTY_PLAYER = {
    role: "player",
    playerId: "",
    displayName: "",
    avatarEmoji: "😀",
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
export const useGameStore = create()((set, get) => ({
    ...EMPTY_HOST,
    sessionId: "",
    roomCode: "",
    reset: () => set({
        ...EMPTY_HOST,
        sessionId: "",
        roomCode: "",
    }),
    selectAnswer: (answerId) => {
        const state = get();
        if (state.role !== "player")
            return;
        const q = state.currentQuestion;
        if (!q)
            return;
        if (q.type === "classic" || q.type === "truefalse") {
            set({ selectedAnswerIds: [answerId] });
        }
        else {
            // Toggle for multiple-select
            const current = state.selectedAnswerIds;
            const next = current.includes(answerId)
                ? current.filter((id) => id !== answerId)
                : [...current, answerId];
            set({ selectedAnswerIds: next });
        }
    },
    clearAnswerSelection: () => {
        set({ selectedAnswerIds: [], answerSubmitted: false });
    },
    applyMessage: (msg) => {
        set((prev) => applyServerMessage(prev, msg));
    },
}));
function applyServerMessage(prev, msg) {
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
            if (prev.role !== "host")
                return {};
            return {
                players: [...prev.players.filter((p) => p.id !== msg.player.id), msg.player],
            };
        case "player_left":
            if (prev.role !== "host")
                return {};
            return {
                players: prev.players.map((p) => p.id === msg.playerId ? { ...p, connected: false } : p),
            };
        case "game_started":
            return { phase: "question" };
        case "question_start": {
            const base = {
                phase: "question",
                currentQuestion: msg.question,
                currentQuestionIndex: msg.questionIndex,
                totalQuestions: msg.totalQuestions,
                questionStartTime: msg.startTime,
                timeLimit: msg.timeLimit,
            };
            if (prev.role === "host") {
                return { ...base, distribution: {}, correctAnswerIds: [], revealData: null, answerCount: 0 };
            }
            return {
                ...base,
                selectedAnswerIds: [],
                answerSubmitted: false,
                lastResult: null,
            };
        }
        case "answer_received":
            if (prev.role !== "host")
                return {};
            return { answerCount: msg.answerCount };
        case "question_end":
            return {
                phase: "revealing",
                correctAnswerIds: msg.correctAnswerIds,
                distribution: msg.distribution,
                revealData: msg.revealData ?? null,
            };
        case "answer_result":
            if (prev.role !== "player")
                return {};
            return {
                lastResult: {
                    correct: msg.correct,
                    pointsEarned: msg.pointsEarned,
                    totalScore: msg.totalScore,
                },
                totalScore: msg.totalScore,
                answerSubmitted: true,
                phase: "revealing",
            };
        case "leaderboard":
            return { phase: "leaderboard", leaderboard: msg.entries };
        case "game_ended":
            return { phase: "ended", leaderboard: msg.finalLeaderboard };
        case "reaction": {
            // Forward to the separate reactionStore — import lazily to avoid circular deps
            import("./reactionStore").then(({ useReactionStore }) => {
                useReactionStore.getState().addReaction({
                    playerId: msg.playerId,
                    displayName: msg.displayName,
                    avatarEmoji: msg.avatarEmoji ?? "😀",
                    gifUrl: msg.gifUrl,
                    caption: msg.caption,
                });
            });
            return {};
        }
        default:
            return {};
    }
}
/** Initialise game store for a host session */
export function initHostGame(sessionId, roomCode) {
    useGameStore.setState({
        ...EMPTY_HOST,
        sessionId,
        roomCode,
    });
}
/** Initialise game store for a player session */
export function initPlayerGame(sessionId, roomCode, playerId, displayName, avatarEmoji) {
    useGameStore.setState({
        ...EMPTY_PLAYER,
        role: "player",
        sessionId,
        roomCode,
        playerId,
        displayName,
        avatarEmoji,
    });
}

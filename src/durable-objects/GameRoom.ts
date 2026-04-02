import type { DurableObject } from "@cloudflare/workers-types";
import { calculateScore, evaluateAnswer, evaluateTypeanswer, evaluateSlider, evaluatePuzzle, evaluatePinanswer, evaluateAudioClip, evaluateVideoClip, buildLeaderboard } from "../lib/scoring.js";
import { containsProfanity } from "../lib/profanity.js";
import { newId } from "../lib/room-code.js";
import {
  getQuizWithQuestions,
  getSessionById,
  updateSessionStatus,
  upsertSessionPlayer,
  updatePlayerScore,
  recordSubmission,
  consumeWsTicket,
} from "../lib/db.js";
import type { Env } from "../worker-env.js";
import type {
  ClientMessage,
  ServerMessage,
  PlayerInMemory,
  LeaderboardEntry,
  SubmissionInMemory,
  QuestionWithAnswers,
  RoomPhase,
  SliderConfig,
  PinAnswerConfig,
  RevealData,
} from "../types/index.js";
import { SCORING } from "../lib/scoring.js";

// ─── Persistent storage keys ──────────────────────────────────────────────────

const S = {
  PHASE: "phase",
  SESSION_ID: "sessionId",
  HOST_ID: "hostId",
  QUIZ_ID: "quizId",
  ROOM_CODE: "roomCode",
  QUESTION_INDEX: "questionIndex",
  QUESTION_START: "questionStartTime",
  PLAYERS: "players", // JSON serialised Map entries
  SUBMISSIONS: "submissions", // JSON serialised Map entries
  PREV_SCORES: "prevScores",
};

type StoredPlayers = Array<[string, Omit<PlayerInMemory, "connected">]>;
type StoredSubmissions = Array<[string, SubmissionInMemory[]]>; // questionId → []

export class GameRoom implements DurableObject {
  private env: Env;

  // ── In-memory hot state ──────────────────────────────────────────────────
  private phase: RoomPhase = "lobby";
  private sessionId = "";
  private hostId = "";
  private quizId = "";
  private roomCode = "";
  private questions: QuestionWithAnswers[] = [];
  private currentQuestionIndex = -1;
  private questionStartTime = 0;
  /** playerId → player data (without live WS ref) */
  private players = new Map<string, PlayerInMemory>();
  /** questionId → submissions array */
  private submissions = new Map<string, SubmissionInMemory[]>();
  /** playerId → score before current question */
  private prevScores = new Map<string, number>();
  private initialised = false;

  constructor(
    private readonly state: DurableObjectState,
    env: Env,
  ) {
    this.env = env;
  }

  // ─── Cloudflare DO entry point ────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    await this.ensureInitialised();

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    const role = url.searchParams.get("role"); // "host" | "player"
    const sessionId = url.searchParams.get("sessionId") ?? "";
    const ticket = url.searchParams.get("ticket") ?? ""; // C1: ticket, not raw JWT
    const displayName = (url.searchParams.get("displayName") ?? "").trim();
    const playerId = url.searchParams.get("playerId") ?? "";
    // C2: truncate avatarEmoji to prevent oversized URL params
    const avatarEmoji = decodeURIComponent(url.searchParams.get("avatarEmoji") ?? "😀").slice(0, 100);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    if (role === "host") {
      const ok = await this.acceptHost(server, sessionId, ticket);
      if (!ok) {
        server.close(4001, "Unauthorised");
        return new Response(null, { status: 101, webSocket: client });
      }
    } else if (role === "player") {
      const ok = await this.acceptPlayer(server, sessionId, displayName, playerId, avatarEmoji);
      if (!ok) {
        server.close(4002, "Cannot join");
        return new Response(null, { status: 101, webSocket: client });
      }
    } else {
      return new Response("Invalid role", { status: 400 });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  // ─── Alarm (question timer expiry OR end-game close) ───────────────────────

  async alarm(): Promise<void> {
    await this.ensureInitialised();
    if (this.phase === "question") {
      await this.endCurrentQuestion();
    } else if (this.phase === "ended") {
      // Close all connections gracefully after game_ended has been delivered
      for (const ws of this.state.getWebSockets()) {
        try { ws.close(1000, "Game over"); } catch { /* already closed */ }
      }
    }
  }

  // ─── WebSocket lifecycle ──────────────────────────────────────────────────

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    await this.ensureInitialised();

    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof rawMessage === "string" ? rawMessage : new TextDecoder().decode(rawMessage)) as ClientMessage;
    } catch {
      this.sendTo(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    const tags = this.state.getTags(ws);
    const isHost = tags.includes("host");
    const playerTag = tags.find((t) => t.startsWith("player:"));
    const playerId = playerTag ? playerTag.slice(7) : null;

    if (msg.type === "pong") return; // heartbeat response

    if (isHost) {
      await this.handleHostMessage(ws, msg);
    } else if (playerId) {
      await this.handlePlayerMessage(ws, playerId, msg);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.ensureInitialised();
    const tags = this.state.getTags(ws);
    const playerTag = tags.find((t) => t.startsWith("player:"));
    if (playerTag) {
      const playerId = playerTag.slice(7);
      const player = this.players.get(playerId);
      if (player) {
        player.connected = false;
        player.disconnectedAt = Date.now();
        await this.persistPlayers();
        this.broadcast({ type: "player_left", playerId, displayName: player.displayName });
      }
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    await this.webSocketClose(ws);
  }

  // ─── Connection acceptance ────────────────────────────────────────────────

  private async acceptHost(
    ws: WebSocket,
    sessionId: string,
    ticket: string,
  ): Promise<boolean> {
    // C1: validate a short-lived D1 ticket instead of a raw JWT in the URL
    const ticketRow = await consumeWsTicket(this.env.DB, ticket);
    if (!ticketRow || ticketRow.session_id !== sessionId) return false;

    const session = await getSessionById(this.env.DB, sessionId);
    if (!session || session.host_id !== ticketRow.host_id) return false;
    if (session.status === "ended") return false;

    // Close any existing host ws
    for (const existing of this.state.getWebSockets("host")) {
      existing.close(4000, "New host connection");
    }

    this.state.acceptWebSocket(ws, ["host", `session:${sessionId}`]);

    // Initialise room state if first connection
    if (!this.sessionId) {
      this.sessionId = session.id;
      this.hostId = session.host_id;
      this.quizId = session.quiz_id;
      this.roomCode = session.room_code;

      const quiz = await getQuizWithQuestions(this.env.DB, session.quiz_id);
      if (!quiz || quiz.questions.length === 0) {
        this.sendTo(ws, { type: "error", message: "Quiz has no questions", code: "NO_QUESTIONS" });
        return false;
      }
      this.questions = quiz.questions;
      await this.persistMeta();
    }

    // Send current room state to host
    this.sendTo(ws, {
      type: "room_state",
      phase: this.phase,
      playerCount: this.players.size,
      currentQuestionIndex: this.currentQuestionIndex,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        displayName: p.displayName,
        score: p.score,
        connected: p.connected,
        avatarEmoji: p.avatarEmoji,
      })),
    });

    await this.sendHostPhaseState(ws);

    return true;
  }

  private async acceptPlayer(
    ws: WebSocket,
    sessionId: string,
    displayName: string,
    existingPlayerId: string,
    avatarEmoji: string,
  ): Promise<boolean> {
    if (!displayName || displayName.length < 1 || displayName.length > 30) return false;

    const session = await getSessionById(this.env.DB, sessionId);
    if (!session || session.id !== this.sessionId) return false;
    if (session.status === "ended") return false;

    const safeName = containsProfanity(displayName) ? "Player" : displayName;

    const existing = existingPlayerId ? this.players.get(existingPlayerId) : null;
    let playerId: string;
    let isReconnect = false;

    if (existing) {
      const elapsed = existing.disconnectedAt ? Date.now() - existing.disconnectedAt : 0;

      if (!existing.connected && elapsed > SCORING.RECONNECT_WINDOW_MS) {
        // Reconnect window expired — treat as a brand-new player
        if (this.phase !== "lobby") {
          ws.close(4003, "Game already in progress");
          return false;
        }
        playerId = newId();
        this.players.set(playerId, {
          id: playerId,
          displayName: safeName,
          avatarEmoji: avatarEmoji || "😀",
          score: 0,
          connected: true,
          disconnectedAt: null,
        });
        await upsertSessionPlayer(this.env.DB, {
          id: playerId,
          session_id: sessionId,
          display_name: safeName,
          avatar_emoji: avatarEmoji || "😀",
        });
        this.broadcast({ type: "player_joined", player: { id: playerId, displayName: safeName, avatarEmoji: avatarEmoji || "😀", score: 0, connected: true } });
      } else {
        // Valid reconnect within window
        playerId = existingPlayerId;
        existing.connected = true;
        existing.disconnectedAt = null;
        isReconnect = true;
        await this.persistPlayers();
        // Notify host that player is back
        this.broadcastTo("host", { type: "player_joined", player: { id: playerId, displayName: existing.displayName, avatarEmoji: existing.avatarEmoji, score: existing.score, connected: true } });
      }
    } else {
      if (this.phase !== "lobby") {
        ws.close(4003, "Game already in progress");
        return false;
      }
      playerId = newId();
      this.players.set(playerId, {
        id: playerId,
        displayName: safeName,
        avatarEmoji: avatarEmoji || "😀",
        score: 0,
        connected: true,
        disconnectedAt: null,
      });
      await upsertSessionPlayer(this.env.DB, {
        id: playerId,
        session_id: sessionId,
        display_name: safeName,
        avatar_emoji: avatarEmoji || "😀",
      });
      this.broadcast({ type: "player_joined", player: { id: playerId, displayName: safeName, avatarEmoji: avatarEmoji || "😀", score: 0, connected: true } });
    }

    this.state.acceptWebSocket(ws, ["player", `player:${playerId}`]);

    const player = this.players.get(playerId);

    // Build reconnect extras: restore score, and leaderboard if visible
    const reconnectLeaderboard =
      isReconnect && (this.phase === "leaderboard" || this.phase === "ended")
        ? buildLeaderboard([...this.players.values()], this.prevScores)
        : undefined;

    this.sendTo(ws, {
      type: "room_state",
      phase: this.phase,
      playerCount: this.players.size,
      currentQuestionIndex: this.currentQuestionIndex,
      ...(isReconnect && player && { totalScore: player.score }),
      ...(reconnectLeaderboard && { leaderboard: reconnectLeaderboard }),
    });

    // Send question state if they join mid-question (or during revealing/leaderboard so UI has question context)
    const inGamePhase = this.phase === "question" || this.phase === "revealing" || this.phase === "leaderboard";
    if (inGamePhase && this.currentQuestionIndex >= 0) {
      const q = this.questions[this.currentQuestionIndex]!;
      this.sendTo(ws, {
        type: "question_start",
        question: this.buildQuestionPayload(q),
        questionIndex: this.currentQuestionIndex,
        totalQuestions: this.questions.length,
        startTime: this.questionStartTime,
        timeLimit: q.time_limit,
      });

      // If reconnecting during revealing or leaderboard, send their past answer result
      if (isReconnect && (this.phase === "revealing" || this.phase === "leaderboard")) {
        const sub = this.submissions.get(q.id)?.find(s => s.playerId === playerId);
        if (sub) {
          this.sendTo(ws, {
            type: "answer_result",
            correct: sub.scoreDelta > 0,
            points: sub.scoreDelta,
            streak: 0,
          });
        } else {
          // Send 0 points if they didn't answer
          this.sendTo(ws, {
            type: "answer_result",
            correct: false,
            points: 0,
            streak: 0,
          });
        }
      }
    }

    // If reconnecting during ended phase, resend the final results
    if (isReconnect && this.phase === "ended" && reconnectLeaderboard) {
      this.sendTo(ws, { type: "game_ended", finalLeaderboard: reconnectLeaderboard });
    }

    await this.persistPlayers();
    return true;
  }

  // ─── Host message handling ────────────────────────────────────────────────

  private async handleHostMessage(ws: WebSocket, msg: ClientMessage): Promise<void> {
    switch (msg.type) {
      case "start_game":
        if (this.phase !== "lobby") {
          this.sendTo(ws, { type: "error", message: "Game already started" });
          return;
        }
        if (this.players.size === 0) {
          this.sendTo(ws, { type: "error", message: "No players in the room" });
          return;
        }
        await this.startGame();
        break;

      case "next_question":
        if (this.phase !== "leaderboard" && this.phase !== "revealing") {
          this.sendTo(ws, { type: "error", message: "Cannot go to next question now" });
          return;
        }
        await this.advanceQuestion();
        break;

      case "force_reveal":
        if (this.phase !== "question") {
          this.sendTo(ws, { type: "error", message: "Not in question phase" });
          return;
        }
        await this.state.storage.deleteAlarm();
        await this.endCurrentQuestion();
        break;

      case "show_leaderboard":
        if (this.phase !== "revealing") {
          this.sendTo(ws, { type: "error", message: "Not in revealing phase" });
          return;
        }
        await this.showLeaderboard();
        break;

      case "end_game":
        await this.endGame();
        break;

      case "kick_player": {
        const player = this.players.get(msg.playerId);
        if (!player) {
          this.sendTo(ws, { type: "error", message: "Player not found" });
          return;
        }
        for (const pws of this.state.getWebSockets(`player:${msg.playerId}`)) {
          this.sendTo(pws, { type: "kicked", reason: "Removed by host" });
          pws.close(4004, "Kicked");
        }
        this.players.delete(msg.playerId);
        this.broadcast({ type: "player_left", playerId: msg.playerId, displayName: player.displayName });
        await this.persistPlayers();
        break;
      }

      default:
        this.sendTo(ws, { type: "error", message: "Unknown message type" });
    }
  }

  // ─── Player message handling ──────────────────────────────────────────────

  private async handlePlayerMessage(
    ws: WebSocket,
    playerId: string,
    msg: ClientMessage,
  ): Promise<void> {
    if (msg.type !== "submit_answer" && msg.type !== "send_reaction") return;

    if (msg.type === "send_reaction") {
      const player = this.players.get(playerId);
      if (!player) return;
      // Rate-limit: cap at 1 reaction per 3 seconds per player (via tag timestamp)
      const gifUrl = msg.gifUrl?.trim() ?? "";
      if (!gifUrl) return;
      this.broadcast({
        type: "reaction",
        playerId,
        displayName: player.displayName,
        avatarEmoji: player.avatarEmoji,
        gifUrl,
        caption: (msg.caption ?? "").slice(0, 60),
      });
      return;
    }

    if (this.phase !== "question") {
      this.sendTo(ws, { type: "error", message: "No active question", code: "NO_QUESTION" });
      return;
    }

    const question = this.questions[this.currentQuestionIndex];
    if (!question || question.id !== msg.questionId) {
      this.sendTo(ws, { type: "error", message: "Wrong question ID", code: "WRONG_QUESTION" });
      return;
    }

    const qSubmissions = this.submissions.get(question.id) ?? [];
    const alreadyAnswered = qSubmissions.some((s) => s.playerId === playerId);
    if (alreadyAnswered) {
      this.sendTo(ws, { type: "error", message: "Already answered", code: "DUPLICATE" });
      return;
    }

    const now = Date.now();
    const serverResponseMs = now - this.questionStartTime;
    const timeLimitMs = question.time_limit * 1000;

    // Reject late submissions
    if (serverResponseMs > timeLimitMs + 500) {
      this.sendTo(ws, { type: "error", message: "Time expired", code: "LATE" });
      return;
    }

    const correctIds = question.answer_options
      .filter((a) => a.is_correct)
      .map((a) => a.id);

    // Correct ordering for puzzle (by order_index)
    const correctOrder = [...question.answer_options]
      .sort((a, b) => a.order_index - b.order_index)
      .map((a) => a.id);

    let isCorrect = false;
    let answerText: string | undefined;
    let sliderValue: number | undefined;

    switch (question.type) {
      case "classic":
      case "multiple":
      case "truefalse":
        isCorrect = evaluateAnswer(msg.answerIds ?? [], correctIds, question.type);
        break;
      case "puzzle":
        isCorrect = evaluatePuzzle(msg.answerIds ?? [], correctOrder);
        break;
      case "typeanswer":
        answerText = (msg.answerText ?? "").trim();
        isCorrect = evaluateTypeanswer(
          answerText,
          question.answer_options.filter((a) => a.is_correct).map((a) => a.text),
        );
        break;
      case "slider":
        sliderValue = msg.sliderValue;
        if (sliderValue !== undefined && question.config) {
          isCorrect = evaluateSlider(sliderValue, question.config as SliderConfig);
        }
        break;
      case "pinanswer":
        if (msg.pinCoords && question.config) {
          isCorrect = evaluatePinanswer(msg.pinCoords, question.config as PinAnswerConfig);
        }
        break;
      case "audioclip": {
        answerText = (msg.answerText ?? "").trim();
        if (question.config) {
          const cfg = question.config as import("../types/index.js").MediaClipConfig;
          const result = evaluateAudioClip(answerText, msg.answerText2?.trim(), cfg);
          isCorrect = result.isCorrect;
          // bonusPoints applied after base points calculation below
          const responseMs2 = Math.min(serverResponseMs, timeLimitMs);
          const basePoints = calculateScore(question.points, question.time_limit, responseMs2, isCorrect);
          const totalPoints = basePoints + result.bonusPoints;
          const player2 = this.players.get(playerId);
          if (player2) player2.score += totalPoints;
          const submission2: SubmissionInMemory = {
            playerId,
            answerIds: [],
            answerText,
            responseTimeMs: responseMs2,
            isCorrect,
            pointsEarned: totalPoints,
          };
          qSubmissions.push(submission2);
          this.submissions.set(question.id, qSubmissions);
          void recordSubmission(this.env.DB, {
            id: newId(),
            session_id: this.sessionId,
            player_id: playerId,
            question_id: question.id,
            answer_option_ids: JSON.stringify([answerText, msg.answerText2 ?? ""]),
            is_correct: isCorrect ? 1 : 0,
            points_earned: totalPoints,
            response_time_ms: responseMs2,
          });
          this.sendTo(ws, {
            type: "answer_result",
            correct: isCorrect,
            pointsEarned: totalPoints,
            totalScore: player2?.score ?? 0,
          });
          this.broadcastTo("host", { type: "answer_received", answerCount: qSubmissions.length, totalPlayers: this.players.size });
          if (qSubmissions.length >= this.players.size) {
            await this.state.storage.deleteAlarm();
            await this.endCurrentQuestion();
          }
          await this.persistPlayers();
          return;
        }
        break;
      }
      case "videoclip": {
        answerText = (msg.answerText ?? "").trim();
        if (question.config) {
          const cfg = question.config as import("../types/index.js").MediaClipConfig;
          isCorrect = evaluateVideoClip(answerText, cfg);
        }
        break;
      }
    }
    const responseMs = Math.min(serverResponseMs, timeLimitMs);
    const points = calculateScore(question.points, question.time_limit, responseMs, isCorrect);

    const submission: SubmissionInMemory = {
      playerId,
      answerIds: msg.answerIds ?? [],
      ...(answerText !== undefined && { answerText }),
      ...(sliderValue !== undefined && { sliderValue }),
      responseTimeMs: responseMs,
      isCorrect,
      pointsEarned: points,
    };

    qSubmissions.push(submission);
    this.submissions.set(question.id, qSubmissions);

    const player = this.players.get(playerId);
    if (player) {
      player.score += points;
    }

    // Record in D1 (non-blocking)
    void recordSubmission(this.env.DB, {
      id: newId(),
      session_id: this.sessionId,
      player_id: playerId,
      question_id: question.id,
      answer_option_ids: JSON.stringify(
        msg.answerIds ?? msg.answerText ?? msg.sliderValue ?? msg.pinCoords ?? []
      ),
      is_correct: isCorrect ? 1 : 0,
      points_earned: points,
      response_time_ms: responseMs,
    });

    // Send result to player
    this.sendTo(ws, {
      type: "answer_result",
      correct: isCorrect,
      pointsEarned: points,
      totalScore: player?.score ?? 0,
    });

    // Notify host of progress
    this.broadcastTo("host", {
      type: "answer_received",
      answerCount: qSubmissions.length,
      totalPlayers: this.players.size,
    });

    // Auto-end question when all players have answered
    if (qSubmissions.length >= this.players.size) {
      await this.state.storage.deleteAlarm();
      await this.endCurrentQuestion();
    }
  }

  // ─── Game flow ────────────────────────────────────────────────────────────

  private async startGame(): Promise<void> {
    this.phase = "question";
    this.currentQuestionIndex = 0;

    await updateSessionStatus(this.env.DB, this.sessionId, "active", { started_at: Date.now() });
    this.broadcast({ type: "game_started" });
    await this.broadcastQuestion();
  }

  private async broadcastQuestion(): Promise<void> {
    const q = this.questions[this.currentQuestionIndex]!;
    this.questionStartTime = Date.now();

    // Snapshot scores before this question
    this.prevScores = new Map(
      [...this.players.entries()].map(([id, p]) => [id, p.score]),
    );

    // Set alarm for auto-end
    await this.state.storage.setAlarm(this.questionStartTime + q.time_limit * 1000 + 500);

    this.broadcast({
      type: "question_start",
      question: this.buildQuestionPayload(q),
      questionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      startTime: this.questionStartTime,
      timeLimit: q.time_limit,
    });

    await this.persistMeta();
  }

  private async endCurrentQuestion(): Promise<void> {
    if (this.phase !== "question") return;
    this.phase = "revealing";

    const q = this.questions[this.currentQuestionIndex]!;
    const reveal = this.buildRevealState(q);

    // Update D1 player scores
    for (const p of this.players.values()) {
      void updatePlayerScore(this.env.DB, p.id, p.score);
    }

    this.broadcast({
      type: "question_end",
      correctAnswerIds: reveal.correctAnswerIds,
      distribution: reveal.distribution,
      ...(reveal.revealData !== undefined && { revealData: reveal.revealData }),
    });
    await this.persistMeta();
  }

  private async showLeaderboard(): Promise<void> {
    this.phase = "leaderboard";
    const entries = this.buildCurrentLeaderboard();
    this.broadcast({ type: "leaderboard", entries, questionIndex: this.currentQuestionIndex });
    await this.persistMeta();
  }

  private async advanceQuestion(): Promise<void> {
    this.currentQuestionIndex += 1;

    if (this.currentQuestionIndex >= this.questions.length) {
      await this.endGame();
      return;
    }

    this.phase = "question";
    await this.broadcastQuestion();
  }

  private async endGame(): Promise<void> {
    this.phase = "ended";
    await this.state.storage.deleteAlarm();
    await updateSessionStatus(this.env.DB, this.sessionId, "ended", { ended_at: Date.now() });

    const finalLeaderboard = this.buildCurrentLeaderboard();
    this.broadcast({ type: "game_ended", finalLeaderboard });

    // Persist final state
    await this.persistMeta();

    // Schedule connection close via alarm (setTimeout doesn't survive DO hibernation)
    await this.state.storage.setAlarm(Date.now() + 5000);
  }

  private async sendHostPhaseState(ws: WebSocket): Promise<void> {
    if (this.currentQuestionIndex < 0 || this.currentQuestionIndex >= this.questions.length) {
      if (this.phase === "leaderboard") {
        this.sendTo(ws, {
          type: "leaderboard",
          entries: this.buildCurrentLeaderboard(),
          questionIndex: this.currentQuestionIndex,
        });
      } else if (this.phase === "ended") {
        this.sendTo(ws, {
          type: "game_ended",
          finalLeaderboard: this.buildCurrentLeaderboard(),
        });
      }
      return;
    }

    const question = this.questions[this.currentQuestionIndex]!;

    if (this.phase === "question" || this.phase === "revealing" || this.phase === "leaderboard") {
      this.sendTo(ws, {
        type: "question_start",
        question: this.buildQuestionPayload(question),
        questionIndex: this.currentQuestionIndex,
        totalQuestions: this.questions.length,
        startTime: this.questionStartTime,
        timeLimit: question.time_limit,
      });
    }

    if (this.phase === "question") {
      const submissions = this.submissions.get(question.id) ?? [];
      this.sendTo(ws, {
        type: "answer_received",
        answerCount: submissions.length,
        totalPlayers: this.players.size,
      });
      return;
    }

    if (this.phase === "revealing" || this.phase === "leaderboard") {
      const reveal = this.buildRevealState(question);
      this.sendTo(ws, {
        type: "question_end",
        correctAnswerIds: reveal.correctAnswerIds,
        distribution: reveal.distribution,
        ...(reveal.revealData !== undefined && { revealData: reveal.revealData }),
      });
    }

    if (this.phase === "leaderboard") {
      this.sendTo(ws, {
        type: "leaderboard",
        entries: this.buildCurrentLeaderboard(),
        questionIndex: this.currentQuestionIndex,
      });
      return;
    }

    if (this.phase === "ended") {
      this.sendTo(ws, {
        type: "game_ended",
        finalLeaderboard: this.buildCurrentLeaderboard(),
      });
    }
  }

  private buildRevealState(q: QuestionWithAnswers): {
    correctAnswerIds: string[];
    distribution: Record<string, number>;
    revealData?: RevealData;
  } {
    const submissions = this.submissions.get(q.id) ?? [];

    const correctIds = q.answer_options.filter((a) => a.is_correct).map((a) => a.id);
    const correctOrder = [...q.answer_options]
      .sort((a, b) => a.order_index - b.order_index)
      .map((a) => a.id);

    const distribution: Record<string, number> = {};
    if (q.type === "classic" || q.type === "multiple" || q.type === "truefalse") {
      for (const opt of q.answer_options) distribution[opt.id] = 0;
      for (const sub of submissions) {
        for (const answerId of sub.answerIds) {
          if (answerId in distribution) distribution[answerId]!++;
        }
      }
    } else if (q.type === "typeanswer" || q.type === "audioclip" || q.type === "videoclip") {
      for (const sub of submissions) {
        if (!sub.answerText) continue;
        const key = sub.answerText.trim().toLowerCase();
        distribution[key] = (distribution[key] ?? 0) + 1;
      }
    } else if (q.type === "slider") {
      for (const sub of submissions) {
        if (sub.sliderValue === undefined) continue;
        const key = `${sub.sliderValue}`;
        distribution[key] = (distribution[key] ?? 0) + 1;
      }
    } else {
      distribution.correct = 0;
      distribution.wrong = 0;
      for (const sub of submissions) {
        if (sub.isCorrect) distribution.correct!++;
        else distribution.wrong!++;
      }
    }

    let revealData: RevealData | undefined;
    if (q.type === "typeanswer") {
      revealData = {
        type: "typeanswer",
        correctTexts: q.answer_options.filter((a) => a.is_correct).map((a) => a.text),
      };
    } else if (q.type === "audioclip" && q.config) {
      const cfg = q.config as import("../types/index.js").MediaClipConfig;
      revealData = {
        type: "audioclip",
        correctTexts: [
          ...(cfg.songTitle ? [cfg.songTitle] : []),
          ...(cfg.songArtist ? [cfg.songArtist] : []),
        ],
      };
    } else if (q.type === "videoclip" && q.config) {
      const cfg = q.config as import("../types/index.js").MediaClipConfig;
      revealData = {
        type: "videoclip",
        correctTexts: [cfg.videoTitle ?? cfg.songTitle ?? ""].filter(Boolean),
      };
    } else if (q.type === "slider" && q.config) {
      const cfg = q.config as SliderConfig;
      revealData = { type: "slider", sliderCorrect: cfg.correct, sliderTolerance: cfg.tolerance };
    } else if (q.type === "puzzle") {
      revealData = {
        type: "puzzle",
        correctTexts: [...q.answer_options]
          .sort((a, b) => a.order_index - b.order_index)
          .map((a) => a.text),
      };
    } else if (q.type === "pinanswer" && q.config) {
      const cfg = q.config as PinAnswerConfig;
      revealData = {
        type: "pinanswer",
        pinHotspot: { x: cfg.hotspotX, y: cfg.hotspotY, radius: cfg.hotspotRadius },
      };
    }

    return {
      correctAnswerIds: q.type === "puzzle" ? correctOrder : correctIds,
      distribution,
      ...(revealData !== undefined && { revealData }),
    };
  }

  // ─── Broadcast helpers ────────────────────────────────────────────────────

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // WebSocket may already be closed
    }
  }

  private sendTo(ws: WebSocket, msg: ServerMessage): void {
    this.send(ws, msg);
  }

  private broadcast(msg: ServerMessage): void {
    for (const ws of this.state.getWebSockets()) {
      this.send(ws, msg);
    }
  }

  private broadcastTo(tag: string, msg: ServerMessage): void {
    for (const ws of this.state.getWebSockets(tag)) {
      this.send(ws, msg);
    }
  }

  private broadcastToPlayers(msg: ServerMessage): void {
    for (const ws of this.state.getWebSockets("player")) {
      this.send(ws, msg);
    }
  }

  // ─── State helpers ────────────────────────────────────────────────────────

  private buildQuestionPayload(q: QuestionWithAnswers) {
    // Shuffle answer options for puzzle so players see random order
    let options = q.answer_options.map((a) => ({ id: a.id, text: a.text }));
    if (q.type === "puzzle") {
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j]!, options[i]!];
      }
    }

    const payload: import("../types/index.js").QuestionPayload = {
      id: q.id,
      text: q.text,
      imageUrl: q.image_url,
      type: q.type,
      answerOptions: options,
    };

    // Include player-safe slider config (no correct value)
    if (q.type === "slider" && q.config) {
      const cfg = q.config as SliderConfig;
      payload.sliderConfig = { min: cfg.min, max: cfg.max, step: cfg.step };
    }

    // Include media URL for audioclip / videoclip (no correct answer in payload)
    if ((q.type === "audioclip" || q.type === "videoclip") && q.config) {
      const cfg = q.config as import("../types/index.js").MediaClipConfig;
      payload.mediaUrl = cfg.mediaUrl;
      if (q.type === "audioclip") {
        payload.hasArtist = !!(cfg.songArtist);
        payload.artistPoints = cfg.artistPoints ?? 500;
      }
    }

    return payload;
  }

  private buildCurrentLeaderboard(): LeaderboardEntry[] {
    return buildLeaderboard(
      [...this.players.values()].map((p) => ({
        id: p.id,
        displayName: p.displayName,
        avatarEmoji: p.avatarEmoji,
        score: p.score,
      })),
      this.prevScores,
    );
  }

  // ─── DO storage persistence ───────────────────────────────────────────────

  private async ensureInitialised(): Promise<void> {
    if (this.initialised) return;
    this.initialised = true;
    await this.state.blockConcurrencyWhile(async () => {
      await this.loadState();
    });
  }

  private async loadState(): Promise<void> {
    const stored = await this.state.storage.list<unknown>();

    this.phase = (stored.get(S.PHASE) as RoomPhase | undefined) ?? "lobby";
    this.sessionId = (stored.get(S.SESSION_ID) as string | undefined) ?? "";
    this.hostId = (stored.get(S.HOST_ID) as string | undefined) ?? "";
    this.quizId = (stored.get(S.QUIZ_ID) as string | undefined) ?? "";
    this.roomCode = (stored.get(S.ROOM_CODE) as string | undefined) ?? "";
    this.currentQuestionIndex = (stored.get(S.QUESTION_INDEX) as number | undefined) ?? -1;
    this.questionStartTime = (stored.get(S.QUESTION_START) as number | undefined) ?? 0;

    const playersData = (stored.get(S.PLAYERS) as StoredPlayers | undefined) ?? [];
    this.players = new Map(
      playersData.map(([id, p]) => [id, { ...p, connected: false }]),
    );

    const subsData = (stored.get(S.SUBMISSIONS) as StoredSubmissions | undefined) ?? [];
    this.submissions = new Map(subsData);

    const prevData = (stored.get(S.PREV_SCORES) as [string, number][] | undefined) ?? [];
    this.prevScores = new Map(prevData);

    // Reload questions from D1 if we have a quiz
    if (this.quizId) {
      const quiz = await getQuizWithQuestions(this.env.DB, this.quizId);
      this.questions = quiz?.questions ?? [];
    }
  }

  private async persistMeta(): Promise<void> {
    await this.state.storage.put({
      [S.PHASE]: this.phase,
      [S.SESSION_ID]: this.sessionId,
      [S.HOST_ID]: this.hostId,
      [S.QUIZ_ID]: this.quizId,
      [S.ROOM_CODE]: this.roomCode,
      [S.QUESTION_INDEX]: this.currentQuestionIndex,
      [S.QUESTION_START]: this.questionStartTime,
      [S.PREV_SCORES]: [...this.prevScores.entries()],
    });
  }

  private async persistPlayers(): Promise<void> {
    const data: StoredPlayers = [...this.players.entries()].map(([id, p]) => [
      id,
      { id: p.id, displayName: p.displayName, avatarEmoji: p.avatarEmoji, score: p.score, disconnectedAt: p.disconnectedAt },
    ]);
    await this.state.storage.put(S.PLAYERS, data);
  }
}

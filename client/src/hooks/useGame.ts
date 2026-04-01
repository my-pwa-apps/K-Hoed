import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "@/stores/gameStore";
import { useGameWebSocket } from "./useWebSocket";
import { gameApi } from "@/lib/api";
import type { ServerMessage } from "@/lib/types";

interface UseHostGameOptions {
  sessionId: string;
  roomCode: string;
  // token no longer required here — hook fetches its own WS ticket (C1 fix)
}

export function useHostGame({ sessionId, roomCode }: UseHostGameOptions) {
  const store = useGameStore();
  const navigate = useNavigate();

  // Fetch a short-lived WS ticket (keeps JWT out of the WebSocket URL)
  const { data: ticketData } = useQuery({
    queryKey: ["ws-ticket", sessionId],
    queryFn: () => gameApi.requestWsTicket(sessionId),
    enabled: !!sessionId,
    staleTime: 90 * 60_000,
    retry: false,
  });
  const ticket = ticketData?.ticket;

  const onMessage = useRef((msg: ServerMessage) => {
    if (msg.type === "game_ended") {
      store.applyMessage(msg);
      setTimeout(() => navigate(`/results/${sessionId}`), 3000);
      return;
    }
    store.applyMessage(msg);
  });
  // Keep ref current so the callback always captures the latest navigate/sessionId
  useEffect(() => {
    onMessage.current = (msg: ServerMessage) => {
      if (msg.type === "game_ended") {
        store.applyMessage(msg);
        setTimeout(() => navigate(`/results/${sessionId}`), 3000);
        return;
      }
      store.applyMessage(msg);
    };
  });

  const { status, send } = useGameWebSocket({
    roomCode,
    role: "host",
    sessionId,
    ticket,
    onMessage: (msg) => onMessage.current(msg),
    enabled: !!roomCode && !!ticket,
  });

  return { store, status, send };
}

interface UsePlayerGameOptions {
  sessionId: string;
  roomCode: string;
  displayName: string;
  playerId: string;
}

export function usePlayerGame({ sessionId, roomCode, displayName, playerId }: UsePlayerGameOptions) {
  const store = useGameStore();
  const navigate = useNavigate();
  const avatarEmoji = store.role === "player" ? store.avatarEmoji : "😀";

  const onMessage = useRef((msg: ServerMessage) => {
    if (msg.type === "kicked") {
      navigate("/join?kicked=1");
      return;
    }
    if (msg.type === "game_ended") {
      store.applyMessage(msg);
      return;
    }
    store.applyMessage(msg);
  });
  useEffect(() => {
    onMessage.current = (msg: ServerMessage) => {
      if (msg.type === "kicked") {
        navigate("/join?kicked=1");
        return;
      }
      if (msg.type === "game_ended") {
        store.applyMessage(msg);
        return;
      }
      store.applyMessage(msg);
    };
  });

  const { status, send } = useGameWebSocket({
    roomCode,
    role: "player",
    sessionId,
    displayName,
    playerId,
    avatarEmoji,
    onMessage: (msg) => onMessage.current(msg),
  });

  // Persist to localStorage (not sessionStorage) so reconnection survives browser close
  useEffect(() => {
    if (playerId)
      localStorage.setItem(`player-${roomCode}`, JSON.stringify({ playerId, displayName, avatarEmoji }));
  }, [playerId, displayName, roomCode, avatarEmoji]);

  return { store, status, send };
}

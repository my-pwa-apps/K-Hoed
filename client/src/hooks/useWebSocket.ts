import { useEffect, useRef, useState, useCallback } from "react";
import { GameWebSocket, type WsStatus, buildWsUrl } from "@/lib/websocket";
import type { ClientMessage } from "@/lib/types";

interface UseWebSocketOptions {
  roomCode: string;
  role: "host" | "player";
  sessionId: string;
  ticket?: string;      // C1: host uses short-lived ticket
  displayName?: string;
  playerId?: string;
  avatarEmoji?: string;
  onMessage: (msg: import("@/lib/types").ServerMessage) => void;
  enabled?: boolean;
}

export function useGameWebSocket({
  roomCode,
  role,
  sessionId,
  ticket,
  displayName,
  playerId,
  avatarEmoji,
  onMessage,
  enabled = true,
}: UseWebSocketOptions) {
  const [status, setStatus] = useState<WsStatus>("closed");
  const wsRef = useRef<GameWebSocket | null>(null);

  const buildUrl = useCallback(
    () =>
      buildWsUrl(roomCode, role, {
        sessionId,
        ticket,
        displayName,
        playerId,
        avatarEmoji,
      }),
    [roomCode, role, sessionId, ticket, displayName, playerId, avatarEmoji],
  );

  useEffect(() => {
    if (!enabled || !roomCode || !sessionId) {
      setStatus("closed");
      return;
    }

    const ws = new GameWebSocket(buildUrl);
    wsRef.current = ws;

    const unsubMsg = ws.on("message", onMessage);
    const unsubStatus = ws.on("statusChange", setStatus);
    const connectTimer = window.setTimeout(() => {
      if (wsRef.current !== ws) return;
      ws.connect();
    }, 0);

    return () => {
      clearTimeout(connectTimer);
      unsubMsg();
      unsubStatus();
      ws.disconnect();
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
    // onMessage changes identity each render — intentionally not in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomCode, sessionId, buildUrl]);

  const send = useCallback((msg: ClientMessage) => {
    return wsRef.current?.send(msg) ?? false;
  }, []);

  return { status, send };
}

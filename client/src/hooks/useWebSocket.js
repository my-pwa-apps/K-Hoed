import { useEffect, useRef, useState, useCallback } from "react";
import { GameWebSocket, buildWsUrl } from "@/lib/websocket";
export function useGameWebSocket({ roomCode, role, sessionId, ticket, displayName, playerId, avatarEmoji, onMessage, enabled = true, }) {
    const [status, setStatus] = useState("closed");
    const wsRef = useRef(null);
    const buildUrl = useCallback(() => buildWsUrl(roomCode, role, {
        sessionId,
        ticket,
        displayName,
        playerId,
        avatarEmoji,
    }), [roomCode, role, sessionId, ticket, displayName, playerId, avatarEmoji]);
    useEffect(() => {
        if (!enabled || !roomCode || !sessionId)
            return;
        const ws = new GameWebSocket(buildUrl);
        wsRef.current = ws;
        const unsubMsg = ws.on("message", onMessage);
        const unsubStatus = ws.on("statusChange", setStatus);
        ws.connect();
        return () => {
            unsubMsg();
            unsubStatus();
            ws.disconnect();
            wsRef.current = null;
        };
        // onMessage changes identity each render — intentionally not in deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, roomCode, sessionId, buildUrl]);
    const send = useCallback((msg) => {
        return wsRef.current?.send(msg) ?? false;
    }, []);
    return { status, send };
}

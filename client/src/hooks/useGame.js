import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "@/stores/gameStore";
import { useGameWebSocket } from "./useWebSocket";
import { gameApi } from "@/lib/api";
export function useHostGame({ sessionId, roomCode }) {
    const store = useGameStore();
    // Fetch a short-lived WS ticket (keeps JWT out of the WebSocket URL)
    const { data: ticketData } = useQuery({
        queryKey: ["ws-ticket", sessionId],
        queryFn: () => gameApi.requestWsTicket(sessionId),
        enabled: !!sessionId,
        staleTime: 90 * 60_000,
        retry: false,
    });
    const ticket = ticketData?.ticket;
    const onMessage = useRef((msg) => {
        if (msg.type === "game_ended") {
            store.applyMessage(msg);
            // No longer auto-navigating to results so the host can view the animated podium
            return;
        }
        store.applyMessage(msg);
    });
    // Keep ref current so the callback always captures the latest navigate/sessionId
    useEffect(() => {
        onMessage.current = (msg) => {
            if (msg.type === "game_ended") {
                store.applyMessage(msg);
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
export function usePlayerGame({ sessionId, roomCode, displayName, playerId }) {
    const store = useGameStore();
    const navigate = useNavigate();
    const avatarEmoji = store.role === "player" ? store.avatarEmoji : "😀";
    const onMessage = useRef((msg) => {
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
        onMessage.current = (msg) => {
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

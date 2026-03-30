import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/stores/gameStore";
import { useGameWebSocket } from "./useWebSocket";
export function useHostGame({ sessionId, roomCode, token }) {
    const store = useGameStore();
    const navigate = useNavigate();
    const onMessage = useRef((msg) => {
        if (msg.type === "game_ended") {
            store.applyMessage(msg);
            setTimeout(() => navigate(`/results/${sessionId}`), 3000);
            return;
        }
        store.applyMessage(msg);
    });
    onMessage.current = (msg) => {
        if (msg.type === "game_ended") {
            store.applyMessage(msg);
            setTimeout(() => navigate(`/results/${sessionId}`), 3000);
            return;
        }
        store.applyMessage(msg);
    };
    const { status, send } = useGameWebSocket({
        roomCode,
        role: "host",
        sessionId,
        token,
        onMessage: (msg) => onMessage.current(msg),
    });
    return { store, status, send };
}
export function usePlayerGame({ sessionId, roomCode, displayName, playerId }) {
    const store = useGameStore();
    const navigate = useNavigate();
    const onMessage = useRef((msg) => {
        if (msg.type === "kicked" || msg.type === "error") {
            if (msg.type === "kicked")
                navigate("/join?kicked=1");
            return;
        }
        if (msg.type === "game_ended") {
            store.applyMessage(msg);
            // Player stays on leaderboard page
            return;
        }
        store.applyMessage(msg);
    });
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
    const { status, send } = useGameWebSocket({
        roomCode,
        role: "player",
        sessionId,
        displayName,
        playerId,
        onMessage: (msg) => onMessage.current(msg),
    });
    // Persist playerId to sessionStorage for reconnection
    useEffect(() => {
        if (playerId)
            sessionStorage.setItem(`player-${roomCode}`, JSON.stringify({ playerId, displayName }));
    }, [playerId, displayName, roomCode]);
    return { store, status, send };
}

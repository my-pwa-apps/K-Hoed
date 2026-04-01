/**
 * Managed WebSocket client with:
 * - Automatic reconnection (exponential back-off)
 * - Typed message handling
 * - Ping/pong heartbeat
 */
export class GameWebSocket {
    buildUrl;
    ws = null;
    status = "closed";
    listeners = new Map();
    reconnectAttempts = 0;
    maxReconnects = 8;
    reconnectTimer = null;
    pingInterval = null;
    intentionallyClosed = false;
    constructor(buildUrl) {
        this.buildUrl = buildUrl;
    }
    connect() {
        this.intentionallyClosed = false;
        this.openConnection();
    }
    disconnect() {
        this.intentionallyClosed = true;
        this.clearTimers();
        this.ws?.close(1000, "Client disconnect");
        this.ws = null;
        this.setStatus("closed");
    }
    send(msg) {
        if (this.status !== "open" || !this.ws)
            return false;
        try {
            this.ws.send(JSON.stringify(msg));
            return true;
        }
        catch {
            return false;
        }
    }
    on(event, handler) {
        if (!this.listeners.has(event))
            this.listeners.set(event, new Set());
        this.listeners.get(event).add(handler);
        return () => {
            this.listeners.get(event)?.delete(handler);
        };
    }
    getStatus() {
        return this.status;
    }
    openConnection() {
        this.setStatus("connecting");
        try {
            this.ws = new WebSocket(this.buildUrl());
        }
        catch {
            this.scheduleReconnect();
            return;
        }
        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.setStatus("open");
            this.startPing();
        };
        this.ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === "ping") {
                    this.send({ type: "pong" });
                    return;
                }
                this.emit("message", msg);
            }
            catch {
                // Ignore unparseable messages
            }
        };
        this.ws.onclose = (e) => {
            this.stopPing();
            this.setStatus("closed");
            if (!this.intentionallyClosed && e.code !== 4001 && e.code !== 4002 && e.code !== 4004) {
                this.scheduleReconnect();
            }
        };
        this.ws.onerror = (e) => {
            this.emit("error", e);
        };
    }
    scheduleReconnect() {
        if (this.intentionallyClosed)
            return;
        if (this.reconnectAttempts >= this.maxReconnects) {
            this.setStatus("error");
            return;
        }
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
        this.reconnectAttempts += 1;
        this.reconnectTimer = setTimeout(() => {
            this.openConnection();
        }, delay);
    }
    startPing() {
        this.pingInterval = setInterval(() => {
            this.send({ type: "pong" }); // keep-alive pong when server hasn't pinged
        }, 25_000);
    }
    stopPing() {
        if (this.pingInterval !== null) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    clearTimers() {
        this.stopPing();
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    setStatus(s) {
        this.status = s;
        this.emit("statusChange", s);
    }
    emit(event, data) {
        const handlers = this.listeners.get(event);
        if (!handlers)
            return;
        for (const handler of handlers) {
            handler(data);
        }
    }
}
/** Build the WebSocket URL for connecting to a game room */
export function buildWsUrl(roomCode, role, params) {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const host = location.host;
    const url = new URL(`${protocol}//${host}/api/rooms/${roomCode}/ws`);
    url.searchParams.set("role", role);
    url.searchParams.set("sessionId", params.sessionId);
    if (params.ticket)
        url.searchParams.set("ticket", params.ticket);
    if (params.displayName)
        url.searchParams.set("displayName", params.displayName);
    if (params.playerId)
        url.searchParams.set("playerId", params.playerId);
    if (params.avatarEmoji)
        url.searchParams.set("avatarEmoji", encodeURIComponent(params.avatarEmoji));
    return url.toString();
}

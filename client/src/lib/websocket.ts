import type { ServerMessage, ClientMessage } from "./types";

export type WsStatus = "connecting" | "open" | "closed" | "error";

export type WsEventMap = {
  message: ServerMessage;
  statusChange: WsStatus;
  error: Event;
};

type Handler<K extends keyof WsEventMap> = (event: WsEventMap[K]) => void;

/**
 * Managed WebSocket client with:
 * - Automatic reconnection (exponential back-off)
 * - Typed message handling
 * - Ping/pong heartbeat
 */
export class GameWebSocket {
  private ws: WebSocket | null = null;
  private status: WsStatus = "closed";
  private listeners = new Map<string, Set<Handler<keyof WsEventMap>>>();
  private reconnectAttempts = 0;
  private maxReconnects = 8;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private intentionallyClosed = false;

  constructor(private buildUrl: () => string) {}

  connect(): void {
    this.intentionallyClosed = false;
    this.openConnection();
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    this.clearTimers();
    this.ws?.close(1000, "Client disconnect");
    this.ws = null;
    this.setStatus("closed");
  }

  send(msg: ClientMessage): boolean {
    if (this.status !== "open" || !this.ws) return false;
    try {
      this.ws.send(JSON.stringify(msg));
      return true;
    } catch {
      return false;
    }
  }

  on<K extends keyof WsEventMap>(event: K, handler: Handler<K>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as Handler<keyof WsEventMap>);
    return () => {
      this.listeners.get(event)?.delete(handler as Handler<keyof WsEventMap>);
    };
  }

  getStatus(): WsStatus {
    return this.status;
  }

  private openConnection(): void {
    this.setStatus("connecting");
    try {
      this.ws = new WebSocket(this.buildUrl());
    } catch {
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
        const msg = JSON.parse(e.data as string) as ServerMessage;
        if (msg.type === "ping") {
          this.send({ type: "pong" });
          return;
        }
        this.emit("message", msg);
      } catch {
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

  private scheduleReconnect(): void {
    if (this.intentionallyClosed) return;
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

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: "pong" }); // keep-alive pong when server hasn't pinged
    }, 25_000);
  }

  private stopPing(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private clearTimers(): void {
    this.stopPing();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(s: WsStatus): void {
    this.status = s;
    this.emit("statusChange", s);
  }

  private emit<K extends keyof WsEventMap>(event: K, data: WsEventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      (handler as Handler<K>)(data);
    }
  }
}

/** Build the WebSocket URL for connecting to a game room */
export function buildWsUrl(
  roomCode: string,
  role: "host" | "player",
  params: {
    sessionId: string;
    ticket?: string;   // C1: host uses a short-lived ticket instead of raw JWT
    displayName?: string;
    playerId?: string;
    avatarEmoji?: string;
  },
): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const host = location.host;
  const url = new URL(`${protocol}//${host}/api/rooms/${roomCode}/ws`);
  url.searchParams.set("role", role);
  url.searchParams.set("sessionId", params.sessionId);
  if (params.ticket) url.searchParams.set("ticket", params.ticket);
  if (params.displayName) url.searchParams.set("displayName", params.displayName);
  if (params.playerId) url.searchParams.set("playerId", params.playerId);
  if (params.avatarEmoji) url.searchParams.set("avatarEmoji", encodeURIComponent(params.avatarEmoji));
  return url.toString();
}

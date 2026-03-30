import type { ApiResponse } from "./types";
import { useAuthStore } from "@/stores/authStore";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !json.success) {
    const err = json as { error?: string; code?: string };
    throw new ApiError(res.status, err.error ?? "Request failed", err.code);
  }

  return (json as { success: true; data: T }).data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: {
    email: string;
    display_name: string;
    password: string;
    turnstile_token?: string;
  }) =>
    request<{ token: string; user: { id: string; email: string; display_name: string } }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify(body) },
    ),

  login: (body: { email: string; password: string; turnstile_token?: string }) =>
    request<{ token: string; user: { id: string; email: string; display_name: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(body) },
    ),

  me: () =>
    request<{ id: string; email: string; display_name: string; created_at: number }>(
      "/api/auth/me",
    ),
};

// ─── Quizzes ─────────────────────────────────────────────────────────────────

export const quizApi = {
  list: () => request<import("./types").Quiz[]>("/api/quizzes"),

  get: (id: string) => request<import("./types").Quiz>(`/api/quizzes/${id}`),

  create: (body: Partial<import("./types").Quiz> & { questions?: import("./types").Question[] }) =>
    request<import("./types").Quiz>("/api/quizzes", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (
    id: string,
    body: Partial<import("./types").Quiz> & { questions?: import("./types").Question[] },
  ) =>
    request<import("./types").Quiz>(`/api/quizzes/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<null>(`/api/quizzes/${id}`, { method: "DELETE" }),

  duplicate: (id: string) =>
    request<import("./types").Quiz>(`/api/quizzes/${id}/duplicate`, { method: "POST" }),

  exportJson: (id: string) => request<import("./types").Quiz>(`/api/quizzes/${id}/export`),

  importJson: (body: unknown) =>
    request<import("./types").Quiz>("/api/quizzes/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ─── Games ────────────────────────────────────────────────────────────────────

export const gameApi = {
  create: (quizId: string) =>
    request<{ session_id: string; room_code: string }>("/api/games", {
      method: "POST",
      body: JSON.stringify({ quiz_id: quizId }),
    }),

  lookupByCode: (code: string) =>
    request<{ session_id: string; room_code: string; status: string }>(`/api/games/${code}`),

  listSessions: () => request<import("./types").QuizSession[]>("/api/games"),

  results: (sessionId: string) =>
    request<{ session: import("./types").QuizSession; players: import("./types").SessionPlayer[] }>(
      `/api/games/session/${sessionId}/results`,
    ),
};

// ─── Upload ───────────────────────────────────────────────────────────────────

export const uploadApi = {
  image: async (file: File): Promise<{ url: string; key: string }> => {
    const token = useAuthStore.getState().token;
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${BASE}/api/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });

    const json = (await res.json()) as ApiResponse<{ url: string; key: string }>;
    if (!json.success) {
      throw new ApiError(res.status, (json as { error: string }).error);
    }
    return (json as { success: true; data: { url: string; key: string } }).data;
  },
};

export { ApiError };

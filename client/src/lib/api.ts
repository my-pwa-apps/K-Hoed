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

const MAX_IMAGE_DIMENSION = 800;
const JPEG_QUALITY = 0.85;
const MAX_IMAGE_BYTES = 700 * 1024; // 700 KB base64 limit for D1

function resizeAndEncodeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (!allowed.has(file.type)) {
      reject(new ApiError(415, "Only JPEG, PNG, WebP, and GIF images are accepted"));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_IMAGE_DIMENSION);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_IMAGE_DIMENSION);
          height = MAX_IMAGE_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

      // Approximate byte size: base64 payload is 3/4 of the string length minus header
      const base64Payload = dataUrl.split(",")[1] ?? "";
      const approxBytes = Math.ceil((base64Payload.length * 3) / 4);
      if (approxBytes > MAX_IMAGE_BYTES) {
        reject(new ApiError(413, "Image is too large even after compression. Try a smaller image."));
        return;
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new ApiError(400, "Could not read image file"));
    };

    img.src = objectUrl;
  });
}

export const uploadApi = {
  /** Resizes + compresses the image client-side and returns a base64 data URL.
   *  No server round-trip — the data URL is stored directly in image_url. */
  image: async (file: File): Promise<{ url: string; key: string }> => {
    const url = await resizeAndEncodeImage(file);
    return { url, key: "" };
  },
};

export { ApiError };

// ─── Brainstorm collaboration (public, token-gated) ───────────────────────────

export const brainstormApi = {
  /** Owner: generate or retrieve the invite token for a quiz. */
  getInvite: (quizId: string) =>
    request<{ token: string }>(`/api/brainstorm/invite/${quizId}`, { method: "POST" }),

  /** Owner: revoke the invite token. */
  revokeInvite: (quizId: string) =>
    request<null>(`/api/brainstorm/invite/${quizId}`, { method: "DELETE" }),

  /** Public: load quiz title + items by token. */
  getByToken: (token: string) =>
    request<{ quiz_title: string; quiz_id: string; items: import("./types").BrainstormItem[] }>(
      `/api/brainstorm/${token}`,
    ),

  /** Public: add an idea. */
  addItem: (
    token: string,
    body: { text: string; suggested_by: string; notes?: string | null },
  ) =>
    request<import("./types").BrainstormItem>(`/api/brainstorm/${token}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Public: delete an idea. */
  deleteItem: (token: string, itemId: string) =>
    request<null>(`/api/brainstorm/${token}/item/${itemId}`, { method: "DELETE" }),
};

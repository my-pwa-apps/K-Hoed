import { useAuthStore } from "@/stores/authStore";
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";
class ApiError extends Error {
    status;
    code;
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = "ApiError";
    }
}
async function request(path, options = {}) {
    const token = useAuthStore.getState().token;
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };
    if (token)
        headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    // Handle 204 No Content
    if (res.status === 204)
        return undefined;
    const json = (await res.json());
    if (!res.ok || !json.success) {
        const err = json;
        throw new ApiError(res.status, err.error ?? "Request failed", err.code);
    }
    return json.data;
}
// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
    register: (body) => request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body) => request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: () => request("/api/auth/me"),
};
// ─── Quizzes ─────────────────────────────────────────────────────────────────
export const quizApi = {
    list: () => request("/api/quizzes"),
    get: (id) => request(`/api/quizzes/${id}`),
    create: (body) => request("/api/quizzes", {
        method: "POST",
        body: JSON.stringify(body),
    }),
    update: (id, body) => request(`/api/quizzes/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
    }),
    delete: (id) => request(`/api/quizzes/${id}`, { method: "DELETE" }),
    duplicate: (id) => request(`/api/quizzes/${id}/duplicate`, { method: "POST" }),
    exportJson: (id) => request(`/api/quizzes/${id}/export`),
    importJson: (body) => request("/api/quizzes/import", {
        method: "POST",
        body: JSON.stringify(body),
    }),
};
// ─── Games ────────────────────────────────────────────────────────────────────
export const gameApi = {
    create: (quizId) => request("/api/games", {
        method: "POST",
        body: JSON.stringify({ quiz_id: quizId }),
    }),
    lookupByCode: (code) => request(`/api/games/${code}`),
    listSessions: () => request("/api/games"),
    results: (sessionId) => request(`/api/games/session/${sessionId}/results`),
};
// ─── Upload ───────────────────────────────────────────────────────────────────
export const uploadApi = {
    image: async (file) => {
        const token = useAuthStore.getState().token;
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${BASE}/api/upload`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
        });
        const json = (await res.json());
        if (!json.success) {
            throw new ApiError(res.status, json.error);
        }
        return json.data;
    },
};
export { ApiError };

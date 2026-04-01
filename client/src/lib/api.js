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
    requestWsTicket: (sessionId) => request(`/api/games/session/${sessionId}/ws-ticket`, { method: "POST" }),
};
// ─── Upload ───────────────────────────────────────────────────────────────────
const MAX_IMAGE_DIMENSION = 800;
const JPEG_QUALITY = 0.85;
const MAX_IMAGE_BYTES = 700 * 1024; // 700 KB base64 limit for D1
function resizeAndEncodeImage(file) {
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
                }
                else {
                    width = Math.round((width / height) * MAX_IMAGE_DIMENSION);
                    height = MAX_IMAGE_DIMENSION;
                }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
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
    image: async (file) => {
        const url = await resizeAndEncodeImage(file);
        return { url, key: "" };
    },
};
export { ApiError };
// ─── Brainstorm collaboration (public, token-gated) ───────────────────────────
export const brainstormApi = {
    /** Owner: generate or retrieve the invite token for a quiz. */
    getInvite: (quizId) => request(`/api/brainstorm/invite/${quizId}`, { method: "POST" }),
    /** Owner: revoke the invite token. */
    revokeInvite: (quizId) => request(`/api/brainstorm/invite/${quizId}`, { method: "DELETE" }),
    /** Public: load quiz title + items by token. */
    getByToken: (token) => request(`/api/brainstorm/${token}`),
    /** Public: add an idea. */
    addItem: (token, body) => request(`/api/brainstorm/${token}`, {
        method: "POST",
        body: JSON.stringify(body),
    }),
    /** Public: delete an idea. */
    deleteItem: (token, itemId) => request(`/api/brainstorm/${token}/item/${itemId}`, { method: "DELETE" }),
};

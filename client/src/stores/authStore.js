import { create } from "zustand";
import { persist } from "zustand/middleware";
export const useAuthStore = create()(persist((set) => ({
    token: null,
    user: null,
    setAuth: (token, user) => set({ token, user }),
    clearAuth: () => set({ token: null, user: null }),
}), {
    name: "k-hoed-auth",
    // Only persist token and user — nothing else
    partialize: (s) => ({ token: s.token, user: s.user }),
}));

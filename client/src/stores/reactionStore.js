import { create } from "zustand";
export const useReactionStore = create()((set) => ({
    reactions: [],
    addReaction: (r) => set((s) => ({
        reactions: [
            ...s.reactions.slice(-19), // Keep last 20
            { ...r, id: crypto.randomUUID(), receivedAt: Date.now() },
        ],
    })),
    pruneOld: () => set((s) => ({
        reactions: s.reactions.filter((r) => Date.now() - r.receivedAt < 8_000),
    })),
}));

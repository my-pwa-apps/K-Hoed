import { create } from "zustand";
export const useReactionStore = create()((set) => ({
    reactions: [],
    addReaction: (r) => set((s) => ({
        reactions: [
            ...s.reactions.slice(-99),
            { ...r, id: crypto.randomUUID(), receivedAt: Date.now() },
        ],
    })),
}));

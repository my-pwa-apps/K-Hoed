import { create } from "zustand";

export interface Reaction {
  id: string;
  playerId: string;
  displayName: string;
  avatarEmoji: string;
  gifUrl: string;
  caption?: string;
  receivedAt: number;
}

interface ReactionStore {
  reactions: Reaction[];
  addReaction: (r: Omit<Reaction, "id" | "receivedAt">) => void;
  /** Remove reactions older than 8 s */
  pruneOld: () => void;
}

export const useReactionStore = create<ReactionStore>()((set) => ({
  reactions: [],

  addReaction: (r) =>
    set((s) => ({
      reactions: [
        ...s.reactions.slice(-19), // Keep last 20
        { ...r, id: crypto.randomUUID(), receivedAt: Date.now() },
      ],
    })),

  pruneOld: () =>
    set((s) => ({
      reactions: s.reactions.filter((r) => Date.now() - r.receivedAt < 8_000),
    })),
}));

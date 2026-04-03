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
}

export const useReactionStore = create<ReactionStore>()((set) => ({
  reactions: [],

  addReaction: (r) =>
    set((s) => ({
      reactions: [
        ...s.reactions.slice(-99),
        { ...r, id: crypto.randomUUID(), receivedAt: Date.now() },
      ],
    })),
}));

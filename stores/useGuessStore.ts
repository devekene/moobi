import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { encryptedStorage } from "@/lib/encrypted-storage";
import {
  createSession,
  guess,
  nextRound,
  revealHint,
  sessionScore,
  type Difficulty,
  type GuessMode,
  type Session,
} from "@/lib/guess";

type GuessState = {
  session: Session | null;
  played: number;
  solved: number;
  best: number;
  start: (mode: GuessMode, difficulty: Difficulty) => void;
  submit: (answer: string) => void;
  hint: () => void;
  next: () => void;
  leave: () => void;
};
const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
export const createGuessStore = (storage: StateStorage) => {
  // Guesses stay in memory; only changes to records need an encrypted write.
  let lastSaved: string | null = null;
  const recordsStorage: StateStorage = {
    getItem: async (name) => {
      const value = await storage.getItem(name);
      lastSaved = value;
      return value;
    },
    setItem: async (name, value) => {
      if (value === lastSaved) return;
      lastSaved = value;
      try {
        await storage.setItem(name, value);
      } catch (error) {
        if (lastSaved === value) lastSaved = null;
        throw error;
      }
    },
    removeItem: (name) => {
      lastSaved = null;
      return storage.removeItem(name);
    },
  };
  return create<GuessState>()(
    persist(
      (set) => ({
        session: null,
        played: 0,
        solved: 0,
        best: 0,
        start: (mode, difficulty) =>
          set({ session: createSession(mode, difficulty) }),
        submit: (answer) =>
          set((state) => ({
            session: state.session ? guess(state.session, answer) : null,
          })),
        hint: () =>
          set((state) => ({
            session: state.session ? revealHint(state.session) : null,
          })),
        next: () =>
          set((state) => {
            if (!state.session || state.session.status !== "result") return {};
            const session = nextRound(state.session);
            return session.status === "finished"
              ? {
                  session,
                  played: state.played + 1,
                  solved:
                    state.solved +
                    session.rounds.filter((r) => r.solved).length,
                  best: Math.max(state.best, sessionScore(session)),
                }
              : { session };
          }),
        leave: () => set({ session: null }),
      }),
      {
        name: "moobi-guess",
        storage: createJSONStorage(() => recordsStorage),
        skipHydration: true,
        partialize: ({ played, solved, best }) => ({ played, solved, best }),
        merge: (saved, current) => {
          if (typeof saved !== "object" || saved === null) return current;
          return {
            ...current,
            played: "played" in saved ? count(saved.played) : 0,
            solved: "solved" in saved ? count(saved.solved) : 0,
            best: "best" in saved ? Math.min(500, count(saved.best)) : 0,
          };
        },
      },
    ),
  );
};
export const useGuessStore = createGuessStore(encryptedStorage);

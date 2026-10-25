import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { encryptedStorage } from "@/lib/encrypted-storage";
import {
  createLudoGame,
  moveLudoSeed,
  rollLudo,
  type DicePair,
  type LudoGame,
  type LudoMode,
  type LudoProtection,
  type LudoStrategy,
} from "@/lib/ludo";

export const LUDO_AVATARS = ["🦊", "🦁", "🐼", "🐯", "🦅", "🐸"] as const;

type LudoState = {
  mode: LudoMode;
  protection: LudoProtection;
  strategy: LudoStrategy;
  avatar: string;
  games: number;
  wins: number;
  game: LudoGame | null;
  chooseMode: (mode: LudoMode) => void;
  chooseProtection: (protection: LudoProtection) => void;
  chooseStrategy: (strategy: LudoStrategy) => void;
  chooseAvatar: (avatar: string) => void;
  start: () => void;
  roll: (values?: DicePair) => void;
  move: (seedIndex: number, dieIndex: 0 | 1) => void;
  leave: () => void;
};

const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const createLudoStore = (storage: StateStorage) => {
  let lastSaved: string | null = null;
  const preferencesStorage: StateStorage = {
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

  return create<LudoState>()(
    persist(
      (set) => ({
        mode: "solo",
        protection: "safe",
        strategy: "balanced",
        avatar: LUDO_AVATARS[0],
        games: 0,
        wins: 0,
        game: null,
        chooseMode: (mode) => set((state) => (state.game ? {} : { mode })),
        chooseProtection: (protection) =>
          set((state) => (state.game ? {} : { protection })),
        chooseStrategy: (strategy) =>
          set((state) => (state.game ? {} : { strategy })),
        chooseAvatar: (avatar) =>
          set((state) =>
            !state.game && LUDO_AVATARS.includes(avatar as (typeof LUDO_AVATARS)[number])
              ? { avatar }
              : {},
          ),
        start: () =>
          set((state) => ({
            game: createLudoGame(
              state.mode,
              state.avatar,
              state.strategy,
              state.protection,
            ),
            games: state.games + 1,
          })),
        roll: (values) =>
          set((state) => ({
            game: state.game
              ? rollLudo(
                  state.game,
                  values ?? [
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1,
                  ],
                )
              : null,
          })),
        move: (seedIndex, dieIndex) =>
          set((state) => {
            if (!state.game) return {};
            const before = state.game.winnerId;
            const game = moveLudoSeed(state.game, seedIndex, dieIndex);
            return {
              game,
              wins:
                !before && game.winnerId === "you" ? state.wins + 1 : state.wins,
            };
          }),
        leave: () => set({ game: null }),
      }),
      {
        name: "moobi-ludo",
        storage: createJSONStorage(() => preferencesStorage),
        skipHydration: true,
        partialize: ({ mode, protection, strategy, avatar, games, wins }) => ({
          mode,
          protection,
          strategy,
          avatar,
          games,
          wins,
        }),
        merge: (saved, current) => {
          if (!isObject(saved)) return current;
          return {
            ...current,
            mode:
              saved.mode === "duel" || saved.mode === "party"
                ? saved.mode
                : "solo",
            protection: saved.protection === "open" ? "open" : "safe",
            strategy:
              saved.strategy === "bold" || saved.strategy === "tactical"
                ? saved.strategy
                : "balanced",
            avatar:
              typeof saved.avatar === "string" &&
              LUDO_AVATARS.includes(saved.avatar as (typeof LUDO_AVATARS)[number])
                ? saved.avatar
                : LUDO_AVATARS[0],
            games: count(saved.games),
            wins: Math.min(count(saved.wins), count(saved.games)),
          };
        },
      },
    ),
  );
};

export const useLudoStore = createLudoStore(encryptedStorage);

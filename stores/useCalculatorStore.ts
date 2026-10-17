import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { encryptedStorage } from "@/lib/encrypted-storage";
import {
  calculatorKey,
  restoreCalculator,
  INITIAL_CALCULATOR,
  type Calculation,
  type CalculatorState,
} from "@/lib/calculator";

type State = CalculatorState & {
  history: Calculation[];
  press: (key: string) => void;
  recall: (entry: Calculation) => void;
  remove: (ids: string[]) => void;
};
export const createCalculatorStore = (storage: StateStorage) =>
  create<State>()(
    persist(
      (set) => ({
        ...INITIAL_CALCULATOR,
        history: [],
        press: (key) =>
          set((state) => {
            const next = calculatorKey(state, key);
            const saved = key === "=" && !state.completed && next.completed;
            return {
              ...next,
              history: saved
                ? [
                    {
                      id: crypto.randomUUID(),
                      expression: next.expression,
                      result: next.result,
                      createdAt: new Date().toISOString(),
                    },
                    ...state.history,
                  ].slice(0, 500)
                : state.history,
            };
          }),
        recall: (entry) =>
          set({
            expression: entry.expression,
            result: entry.result,
            completed: true,
          }),
        remove: (ids) =>
          set((state) => ({
            history: state.history.filter((entry) => !ids.includes(entry.id)),
          })),
      }),
      {
        name: "moobi-calculator",
        storage: createJSONStorage(() => storage),
        skipHydration: true,
        merge: (saved, current) => ({
          ...current,
          ...restoreCalculator(saved),
        }),
        partialize: ({ history, expression, result, completed, degrees }) => ({
          history,
          expression,
          result,
          completed,
          degrees,
        }),
      },
    ),
  );
export const useCalculatorStore = createCalculatorStore(encryptedStorage);

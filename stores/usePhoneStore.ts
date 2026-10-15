import { create } from "zustand";
import { ScreenOptions } from "@/types";
import { PHONE_LAUNCHER_PAGE_COUNT } from "@/lib/app-library";

type PhoneState = {
  currentScreen: ScreenOptions;
  phonePage: number;
  lastScreen: ScreenOptions;
  history: ScreenOptions[];
  showControlCenter: boolean;
  setCurrentScreen: (screen: ScreenOptions) => void;
  setLastScreen: (screen: ScreenOptions) => void;
  toggleControlCenter: () => void;
  addToHistory: (screen: ScreenOptions) => void;
  removeFromHistory: (screen: ScreenOptions) => void;
  clearHistory: () => void;

  showAppSwitcher: boolean;
  passcodeEntryOpen: boolean;
  setPasscodeEntryOpen: (value: boolean) => void;
  setShowAppSwitcher: (value: boolean) => void;
  setPhonePage: (page: number) => void;
  fetchPhonePage: (dir: "left" | "right") => void;
};

export const usePhoneStore = create<PhoneState>((set, get) => ({
  currentScreen: "screen-boot",
  lastScreen: "home",
  phonePage: 0,
  showControlCenter: false,
  history: [],
  showAppSwitcher: false,
  passcodeEntryOpen: false,

  setCurrentScreen: (screen) => {
    const { currentScreen, history } = get();

    const systemScreens = [
      "screen-boot",
      "screen-shutdown",
      "screen-lock",
      "home",
    ];

    const updatedHistory = (() => {
      if (systemScreens.includes(screen)) return history;

      const filtered = history.filter((s) => s !== screen);
      return [...filtered, screen];
    })();

    set({
      ...(!systemScreens.includes(currentScreen) && {
        lastScreen: currentScreen,
      }),
      currentScreen: screen,
      history: updatedHistory,
      passcodeEntryOpen: false,
    });
  },

  setLastScreen: (screen) => set({ lastScreen: screen }),

  toggleControlCenter: () =>
    set((state) => ({ showControlCenter: !state.showControlCenter })),
  addToHistory: (screen) =>
    set((state) => ({ history: [...state.history, screen] })),
  removeFromHistory: (screen) => {
    const { history } = get();
    const filtered = history.filter((s) => s !== screen);
    set({ history: filtered });
  },
  clearHistory: () => set({ history: [] }),

  setShowAppSwitcher: (value) => set({ showAppSwitcher: value }),
  setPasscodeEntryOpen: (value) => set({ passcodeEntryOpen: value }),
  setPhonePage: (page) =>
    set({ phonePage: Math.min(PHONE_LAUNCHER_PAGE_COUNT - 1, Math.max(0, page)) }),
  fetchPhonePage: (direction) => {
    const { phonePage } = get();

    if (direction === "left" && phonePage < PHONE_LAUNCHER_PAGE_COUNT - 1) {
      set({ phonePage: phonePage + 1 });
    }

    if (direction === "right" && phonePage > 0) {
      set({ phonePage: phonePage - 1 });
    }
  },
}));

// export const usePhoneStore = create<PhoneState>()(
//   persist(
//     (set, get) => ({
//       currentScreen: "screen-boot",
//       history: ["screen-boot"],
//
//       setScreen: (screen) =>
//         set((state) => ({
//           currentScreen: screen,
//           history: [...state.history, screen],
//         })),
//
//       goBack: () => {
//         const history = get().history;
//         if (history.length > 1) {
//           history.pop();
//           set({ currentScreen: history[history.length - 1], history });
//         }
//       },
//     }),
//     { name: "phone-store" } // localStorage key
//   )
// );

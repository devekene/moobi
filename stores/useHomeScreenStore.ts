import { encryptedStorage } from "@/lib/encrypted-storage";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { mobileApps } from "@/lib/app-registry";
import type { PhoneAppId } from "@/lib/phone-apps";
import { DOCK_APP_IDS } from "@/lib/home-screen";

export type HomeScreenState = {
  appOrders: Record<string, PhoneAppId[]>;
  dockOrder: PhoneAppId[];
  setAppOrder: (page: number, appIds: PhoneAppId[]) => void;
  setDockOrder: (appIds: PhoneAppId[]) => void;
};

const defaultAppOrders: Record<string, PhoneAppId[]> = {};
mobileApps.forEach((apps, page) => {
  defaultAppOrders[String(page)] = apps.map((app) => app.id);
});

export const createHomeScreenStore = (storage: StateStorage) =>
  create<HomeScreenState>()(
    persist(
      (set) => ({
        appOrders: defaultAppOrders,
        dockOrder: DOCK_APP_IDS,
        setAppOrder: (page, appIds) =>
          set((state) => ({
            appOrders: { ...state.appOrders, [String(page)]: appIds },
          })),
        setDockOrder: (appIds) => set({ dockOrder: appIds }),
      }),
      {
        name: "moobi-home-screen",
        storage: createJSONStorage(() => storage),
        skipHydration: storage === encryptedStorage,
      },
    ),
  );

export const useHomeScreenStore = createHomeScreenStore(encryptedStorage);

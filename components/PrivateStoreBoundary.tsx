"use client";

import { useEffect } from "react";
import { useInstalledAppsStore } from "@/stores/useInstalledAppsStore";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { isExternalAppId } from "@/lib/phone-apps";

/** Optional accounts never hold up boot or bundled apps. No tokens enter client state. */
export function PrivateStoreBoundary() {
  useEffect(() => {
    const refresh = () => {
      void useInstalledAppsStore.getState().refresh();
    };
    refresh();
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("moobi-private-store")
        : null;
    if (channel)
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (event.data === "auth")
          useInstalledAppsStore.getState().clearSession();
        refresh();
      };
    const unsubscribe = useInstalledAppsStore.subscribe((next, previous) => {
      if (next.user?.id !== previous.user?.id) {
        const phone = usePhoneStore.getState();
        if (isExternalAppId(phone.currentScreen))
          phone.setCurrentScreen("home");
        for (const screen of phone.history)
          if (isExternalAppId(screen)) phone.removeFromHistory(screen);
      }
    });
    return () => {
      channel?.close();
      unsubscribe();
    };
  }, []);
  return null;
}

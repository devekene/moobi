import { useMemo } from "react";
import { getPhoneApps } from "@/lib/phone-apps";
import { useInstalledAppsStore } from "@/stores/useInstalledAppsStore";
export function usePhoneApps() {
  const installed = useInstalledAppsStore((state) => state.installations);
  return useMemo(() => getPhoneApps(installed), [installed]);
}

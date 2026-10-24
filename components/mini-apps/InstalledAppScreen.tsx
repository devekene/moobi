"use client";

import { useEffect, useMemo, useState } from "react";
import { installationRepository } from "@/lib/mini-app-installations";
import type { MiniAppPackage } from "@/lib/mini-app-package";
import { useInstalledAppsStore } from "@/stores/useInstalledAppsStore";
import { isRecord } from "@/lib/mini-app-package";
import { privateRequest } from "@/lib/private-store-client";
import { usePhoneStore } from "@/stores/usePhoneStore";
import SandboxFrame from "./SandboxFrame";
import styles from "./private-store.module.css";

export default function InstalledAppScreen({ appId }: { appId: string }) {
  const user = useInstalledAppsStore((state) => state.user);
  const accountId = user?.id;
  const rollback = useInstalledAppsStore((state) => state.rollback);
  const recoveryVersion = useInstalledAppsStore(
    (state) =>
      state.installations.find((entry) => entry.app.id === appId)
        ?.rollbackVersion,
  );
  const runtimeOrigin = useInstalledAppsStore((state) => state.runtimeOrigin);
  const [app, setApp] = useState<MiniAppPackage | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const storage = useMemo(
    () => (accountId ? installationRepository.storage(accountId) : undefined),
    [accountId],
  );
  useEffect(() => {
    let active = true;
    let runningReleaseId = "";
    if (accountId)
      void installationRepository
        .load(accountId, appId)
        .then(async (entry) => {
          runningReleaseId = entry.release.id;
          {
            const status = await privateRequest(
              `store/releases/${entry.release.id}/availability`,
            );
            if (!isRecord(status) || status.available !== true)
              throw new Error(
                "This release is suspended, revoked, or no longer available to your account. Your saved data is kept.",
              );
          }
          if (active) {
            setApp(entry.package);
            setError("");
          }
        })
        .catch((failure: unknown) => {
          if (active)
            setError(
              failure instanceof Error
                ? failure.message
                : "Could not open installed app.",
            );
        });
    const recheck = () => {
      if (!document.hidden && runningReleaseId)
        void (async () => {
          const status = await privateRequest(
            `store/releases/${runningReleaseId}/availability`,
          );
          if (!isRecord(status) || status.available !== true)
            throw new Error(
              "This release is no longer available. Your files and data are kept.",
            );
        })().catch((failure: unknown) => {
          if (active)
            setError(
              failure instanceof Error
                ? failure.message
                : "Could not check availability. Retry.",
            );
        });
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      active = false;
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [appId, accountId, attempt]);
  const home = () => usePhoneStore.getState().setCurrentScreen("home");
  if (!user || !runtimeOrigin || error)
    return (
      <section className={styles.panel}>
        <h1>App unavailable</h1>
        <p role="alert">
          {error ||
            (!user
              ? "Sign in to open your installed apps."
              : "The app runtime is unavailable. Your installed files and saved data were preserved.")}
        </p>
        <button
          type="button"
          onClick={() => {
            setApp(null);
            setError("");
            setAttempt((value) => value + 1);
          }}
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => usePhoneStore.getState().setCurrentScreen("app-store")}
        >
          Open App Store
        </button>
        <button type="button" onClick={home}>
          Home
        </button>
      </section>
    );
  if (!app)
    return (
      <p role="status" className={styles.panel}>
        Checking installed app files…
      </p>
    );
  return (
    <SandboxFrame
      key={`${appId}:${attempt}`}
      app={app}
      storage={storage}
      runtimeOrigin={runtimeOrigin}
      installed
      onRecover={
        recoveryVersion
          ? async () => {
              try {
                await rollback(appId);
                setApp(null);
                setError("");
                setAttempt((value) => value + 1);
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "Recovery failed.",
                );
              }
            }
          : undefined
      }
      onStop={home}
    />
  );
}

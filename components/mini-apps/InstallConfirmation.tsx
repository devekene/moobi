"use client";
import { parseMiniAppPackage } from "@/lib/mini-app-package";
import { useInstalledAppsStore } from "@/stores/useInstalledAppsStore";
import styles from "./private-store.module.css";
export default function InstallConfirmation({
  busy,
  run,
}: {
  busy: boolean;
  run: (work: () => Promise<void>) => Promise<void>;
}) {
  const state = useInstalledAppsStore();
  const pending = state.pendingInstall;
  return (
    <>
      {pending && (
        <section className={styles.card} aria-label="Confirm installation">
          <h2>
            {pending.expectedReleaseId ? "Update" : "Install"}{" "}
            {pending.app.name}?
          </h2>
          <p>v{pending.release.version} · Files verified</p>
          <p>
            {parseMiniAppPackage(pending.source).manifest.permissions.includes(
              "storage",
            )
              ? "Allow this app to save its own data on this phone (up to 32 KiB). It cannot access another app’s data."
              : "This app requests no Moobi storage permissions."}
          </p>
          {pending.expectedReleaseId && (
            <p>
              Saved data stays. The previous package is kept for recovery. The
              new version starts when you next open the app.
            </p>
          )}
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() => void run(() => state.confirmInstall())}
          >
            {pending.expectedReleaseId ? "Install update" : "Install app"}
          </button>
          <button disabled={busy} onClick={state.cancelInstall}>
            Cancel
          </button>
        </section>
      )}
      {state.downloading && (
        <div role="status" className={styles.card}>
          <p>Downloading and verifying… {state.progress}%</p>
          <progress
            aria-label="Package download"
            value={state.progress}
            max={100}
          />
          <button onClick={state.cancelInstall}>Cancel download</button>
        </div>
      )}
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import {
  MAX_PACKAGE_BYTES,
  packageDigest,
  parseMiniAppPackage,
  type MiniAppPackage,
} from "@/lib/mini-app-package";
import { SAMPLE_PACKAGE } from "@/lib/mini-app-sample";
import SandboxFrame from "./SandboxFrame";
import styles from "./sandbox.module.css";

export default function AppSandbox() {
  const [app, setApp] = useState<MiniAppPackage>(SAMPLE_PACKAGE);
  const [running, setRunning] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [digest, setDigest] = useState("");
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const launch = useRef<HTMLButtonElement>(null);
  const selection = useRef(0);

  const load = async (file: File | undefined) => {
    if (!file) return;
    const ticket = ++selection.current;
    setBusy(true);
    setError("");
    try {
      if (file.size > MAX_PACKAGE_BYTES)
        throw new Error("Preview packages must be 256 KiB or smaller.");
      const parsed = parseMiniAppPackage(await file.text());
      const hash = await packageDigest(parsed);
      if (ticket !== selection.current) return;
      setRunning(false);
      setApp(parsed);
      setDigest(hash);
    } catch (failure) {
      if (ticket === selection.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not read the package.",
        );
    } finally {
      if (ticket === selection.current) setBusy(false);
    }
  };

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(SAMPLE_PACKAGE, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pocket-counter.moobi.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className={styles.lab}>
      <p className={styles.intro}>
        Try a web mini app in your virtual phone. Packages stay in this tab;
        nothing is published.
      </p>
      {!running ? (
        <>
          <section className={styles.card}>
            <p className={styles.eyebrow}>LOCAL DEVELOPER PREVIEW</p>
            <h2 ref={heading} tabIndex={-1}>
              {app.manifest.name}
            </h2>
            <p>
              {app.manifest.id} · v{app.manifest.version} · SDK{" "}
              {app.manifest.sdkVersion}
            </p>
            <p>
              Permissions:{" "}
              {app.manifest.permissions.length ? "app-scoped storage" : "none"}.
            </p>
            {digest && <p className={styles.digest}>SHA-256: {digest}</p>}
            <button
              ref={launch}
              type="button"
              disabled={busy}
              className={styles.primary}
              onClick={() => {
                setAttempt((value) => value + 1);
                setRunning(true);
              }}
            >
              Start preview
            </button>
          </section>
          <div className={styles.actions}>
            <label className={styles.file}>
              Choose preview package
              <input
                type="file"
                accept=".json,application/json"
                disabled={busy}
                onChange={(event) => {
                  void load(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <button type="button" onClick={download}>
              Download sample package
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                selection.current++;
                setApp(SAMPLE_PACKAGE);
                setDigest("");
                setError("");
              }}
            >
              Use sample app
            </button>
          </div>
          {busy && <p role="status">Checking package…</p>}
          {error && <p role="alert">{error}</p>}
          <p className={styles.note}>
            Choose a self-contained .moobi.json file up to 256 KiB. This
            prototype supports index.html, app.css, and app.js. ZIP upload and
            Store installation are available in Mi Store → Private apps &amp;
            publishing.
          </p>
        </>
      ) : (
        <SandboxFrame
          key={attempt}
          app={app}
          runtimeOrigin={
            process.env.NEXT_PUBLIC_MINI_APP_RUNTIME_ORIGIN || undefined
          }
          onStop={() => {
            setRunning(false);
            window.requestAnimationFrame(() => launch.current?.focus());
          }}
        />
      )}
    </div>
  );
}

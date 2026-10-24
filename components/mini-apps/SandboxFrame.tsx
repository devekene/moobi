"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  authenticatePreviewMessage,
  createPreviewBridge,
  PREVIEW_CHANNEL,
} from "@/lib/mini-app-bridge";
import type { MiniAppPackage } from "@/lib/mini-app-package";
import type { MiniAppEnvironment, MiniAppEvent } from "@/lib/mini-app-sdk";
import {
  buildPreviewDocument,
  encodeRuntimeDocument,
  PREVIEW_PERMISSIONS,
  PREVIEW_SANDBOX,
} from "@/lib/mini-app-runtime";
import { previewStorage } from "@/lib/mini-app-storage";
import { usePhoneAppearanceStore } from "@/stores/usePhoneAppearanceStore";
import { usePhoneStore } from "@/stores/usePhoneStore";
import styles from "./sandbox.module.css";

const TOKENS = [
  "canvas",
  "surface",
  "surface-elevated",
  "text",
  "text-secondary",
  "text-muted",
  "border",
  "focus",
  "accent",
  "on-accent",
];

export default function SandboxFrame({
  app,
  onStop,
  storage = previewStorage,
  runtimeOrigin,
  installed = false,
  onRecover,
}: {
  app: MiniAppPackage;
  onStop: () => void;
  storage?: typeof previewStorage;
  runtimeOrigin?: string;
  installed?: boolean;
  onRecover?: () => Promise<void>;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const frameName = useId();
  const container = useRef<HTMLDivElement>(null);
  const send = useRef<
    (event: MiniAppEvent, value?: MiniAppEnvironment) => void
  >(() => {});
  const refreshEnvironment = useRef<() => void>(() => {});
  const frameLoaded = useRef<() => void>(() => {});
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("Preparing isolated preview…");
  const [failed, setFailed] = useState(false);
  const appearance = usePhoneAppearanceStore((state) => state.appearance);
  const covered = usePhoneStore(
    (state) => state.showAppSwitcher || state.showControlCenter,
  );

  useEffect(() => {
    if (!window.crypto?.subtle || !window.crypto.randomUUID) {
      void Promise.resolve().then(() => {
        setStatus(
          "Preview requires HTTPS or localhost and Web Crypto support.",
        );
        setFailed(true);
      });
      return;
    }
    const session = crypto.randomUUID();
    const bridge = createPreviewBridge(app, session, storage);
    let active = true;
    let ready = false;
    let loads = 0;
    let runtimeDocument = "";
    const post = (value: unknown) => {
      // An opaque sandbox origin requires '*'. Only this exact frame receives it;
      // session/source checks authenticate replies. No host secrets cross here.
      if (active) frame.current?.contentWindow?.postMessage(value, "*");
    };
    send.current = (event, value) =>
      post({ channel: PREVIEW_CHANNEL, session, event, value });
    const environment = () => {
      if (!container.current) return;
      const computed = getComputedStyle(container.current);
      send.current("environment", {
        theme: usePhoneAppearanceStore.getState().appearance,
        tokens: Object.fromEntries(
          TOKENS.map((name) => {
            const key = `--phone-${name}`;
            return [key, computed.getPropertyValue(key).trim()];
          }),
        ),
        // Settings already receives the shell's safe-area viewport.
        safeArea: { top: 0, bottom: 0 },
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches,
      });
    };
    refreshEnvironment.current = environment;
    const fail = (message: string) => {
      bridge.close();
      ready = false;
      if (active) {
        setStatus(message);
        setFailed(true);
      }
    };
    const timeout = window.setTimeout(() => {
      if (!ready)
        fail("The app did not start. Stop the preview and try again.");
    }, 8000);
    const receive = async (event: MessageEvent<unknown>) => {
      if (!active) return;
      const request = authenticatePreviewMessage(
        event,
        frame.current?.contentWindow ?? null,
        session,
      );
      if (!request) return;
      const response = await bridge.receive(event.data);
      if (!active || !response) return;
      if (request.method === "fault") {
        fail("The app encountered an error. Stop or restart the preview.");
        return;
      }
      if (request.method === "ready" && response.ok) {
        if (ready) return;
        ready = true;
        window.clearTimeout(timeout);
        environment();
        send.current("launch");
        const phone = usePhoneStore.getState();
        if (document.hidden || phone.showAppSwitcher || phone.showControlCenter)
          send.current("pause");
        setStatus(
          installed
            ? "App ready. Saved data stays on this phone."
            : "Running in an isolated preview. Saved data stays on this browser.",
        );
      }
      post(response);
    };
    const visibility = () => {
      const phone = usePhoneStore.getState();
      if (ready)
        send.current(
          document.hidden || phone.showAppSwitcher || phone.showControlCenter
            ? "pause"
            : "resume",
        );
    };
    const resize = new ResizeObserver(() => {
      if (ready) environment();
    });
    if (container.current) resize.observe(container.current);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    motion.addEventListener("change", environment);
    window.addEventListener("message", receive);
    document.addEventListener("visibilitychange", visibility);
    // Dedicated runtime first loads its empty bootstrap, then accepts a form POST.
    // No package credentials or user tokens are sent to the runtime service.
    const onLoad = () => {
      loads++;
      if (runtimeOrigin && loads === 1) {
        const target = frame.current;
        if (!target) return;
        const form = document.createElement("form");
        form.method = "POST";
        form.action = `${runtimeOrigin}/render`;
        form.target = target.name;
        form.hidden = true;
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "document";
        input.value = encodeRuntimeDocument(runtimeDocument);
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        form.remove();
        return;
      }
      if (loads > (runtimeOrigin ? 2 : 1))
        fail("The preview navigated away. Restart to return to the package.");
    };
    frameLoaded.current = onLoad;
    void buildPreviewDocument(app, session, window.location.origin)
      .then((html) => {
        if (active) {
          runtimeDocument = html;
          setSource(html);
        }
      })
      .catch(() =>
        fail(
          "This browser could not prepare the preview. Use HTTPS or localhost and retry.",
        ),
      );
    return () => {
      send.current("pause");
      active = false;
      bridge.close();
      send.current = () => {};
      refreshEnvironment.current = () => {};
      frameLoaded.current = () => {};
      window.clearTimeout(timeout);
      resize.disconnect();
      motion.removeEventListener("change", environment);
      window.removeEventListener("message", receive);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [app, storage, runtimeOrigin, installed]);

  useEffect(() => {
    refreshEnvironment.current();
    send.current(covered || document.hidden ? "pause" : "resume");
  }, [appearance, covered]);

  return (
    <div ref={container} className={styles.preview} data-installed={installed}>
      <div className={styles.toolbar}>
        <button type="button" onClick={() => send.current("back")}>
          Send Back
        </button>
        <button type="button" onClick={onStop}>
          {installed ? "Home" : "Stop preview"}
        </button>
      </div>
      <p role={failed ? "alert" : "status"} className={styles.status}>
        {status}
      </p>
      {failed && onRecover && (
        <button type="button" onClick={() => void onRecover()}>
          Restore previous version (keep saved data)
        </button>
      )}
      {!failed && source && (
        <iframe
          ref={frame}
          name={`moobi-frame-${frameName}`}
          className={styles.frame}
          title={`${app.manifest.name} isolated preview`}
          sandbox={PREVIEW_SANDBOX}
          allow={PREVIEW_PERMISSIONS}
          referrerPolicy="no-referrer"
          onLoad={() => frameLoaded.current()}
          srcDoc={runtimeOrigin ? undefined : source}
          src={runtimeOrigin ? `${runtimeOrigin}/bootstrap` : undefined}
        />
      )}
    </div>
  );
}

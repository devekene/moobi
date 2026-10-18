import type { BrowserProbe } from "./browser-embedding";
export type VisitStage =
  "checking" | "loading" | "blocked" | "leaving" | "external" | "ready";

/** One cancellable visit owns its probe, loading deadline, and single external handoff. */
export function beginBrowserVisit(
  url: string,
  onStage: (stage: VisitStage) => void,
  handoff: () => void,
) {
  const controller = new AbortController();
  let active = true;
  let stage: VisitStage = "checking";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const probeDeadline = setTimeout(() => controller.abort(), 6000);
  function enter(next: VisitStage) {
    if (!active) return;
    clearTimeout(timer);
    stage = next;
    onStage(next);
    if (next === "loading") timer = setTimeout(() => enter("leaving"), 8000);
    if (next === "blocked") timer = setTimeout(() => enter("leaving"), 1000);
    if (next === "leaving")
      timer = setTimeout(() => {
        if (!active) return;
        enter("external");
        handoff();
      }, 900);
  }
  async function check() {
    try {
      const response = await fetch(
        `/api/browser/ping?url=${encodeURIComponent(url)}`,
        { signal: controller.signal },
      );
      const result: { status?: BrowserProbe } = await response.json();
      enter(
        response.ok && result.status === "ok"
          ? "loading"
          : result.status === "blocked"
            ? "blocked"
            : "leaving",
      );
    } catch {
      enter("leaving");
    } finally {
      clearTimeout(probeDeadline);
    }
  }
  void check();
  return {
    loaded: () => {
      if (stage === "loading") enter("ready");
    },
    failed: () => {
      if (stage === "loading") enter("leaving");
    },
    cancel: () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(probeDeadline);
      controller.abort();
    },
  };
}

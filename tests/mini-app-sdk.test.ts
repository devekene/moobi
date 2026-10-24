import { describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { buildPreviewDocument } from "@/lib/mini-app-runtime";
import { SAMPLE_PACKAGE } from "@/lib/mini-app-sample";
import type { MiniAppSDK } from "@/lib/mini-app-sdk";

async function setup() {
  const html = await buildPreviewDocument(
    SAMPLE_PACKAGE,
    "session",
    "https://moobi.example",
  );
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (!script) throw new Error("SDK bootstrap missing");
  const listeners = new Map<string, (event?: unknown) => void>();
  const parent = { postMessage: vi.fn() };
  const window: { moobi?: MiniAppSDK } = {};
  const style = { colorScheme: "", setProperty: vi.fn() };
  runInNewContext(script, {
    window,
    parent,
    document: { documentElement: { style } },
    addEventListener: (name: string, listener: (event?: unknown) => void) => {
      listeners.set(name, listener);
    },
    setTimeout: () => 1,
    clearTimeout: vi.fn(),
  });
  const sdk = window.moobi;
  if (!sdk) throw new Error("SDK not exposed");
  const message = (
    data: unknown,
    origin = "https://moobi.example",
    source: unknown = parent,
  ) => listeners.get("message")?.({ data, origin, source });
  const reply = (id: number, extra = {}) =>
    message({
      channel: "moobi-preview-v1",
      session: "session",
      id,
      ok: true,
      value: null,
      ...extra,
    });
  return { sdk, parent, message, reply, listeners, style };
}

describe("SDK inside the sandbox", () => {
  it("waits for document load, authenticates the parent, and resolves readiness", async () => {
    const { sdk, parent, listeners, reply, message } = await setup();
    expect(parent.postMessage).not.toHaveBeenCalled();
    listeners.get("load")?.();
    expect(parent.postMessage).toHaveBeenCalledWith(
      {
        channel: "moobi-preview-v1",
        session: "session",
        id: 1,
        method: "ready",
      },
      "https://moobi.example",
    );
    let ready = false;
    void sdk.ready.then(() => {
      ready = true;
    });
    message(
      { channel: "moobi-preview-v1", session: "session", id: 1, ok: true },
      "https://attacker.example",
    );
    message(
      { channel: "moobi-preview-v1", session: "session", id: 1, ok: true },
      "https://moobi.example",
      {},
    );
    reply(1, { session: "stale" });
    await Promise.resolve();
    expect(ready).toBe(false);
    reply(1);
    await expect(sdk.ready).resolves.toBeNull();
  });
  it("applies host tokens and zero content insets, and delivers lifecycle events", async () => {
    const { sdk, message, style } = await setup();
    const listener = vi.fn();
    const unsubscribe = sdk.onEvent(listener);
    const environment = {
      theme: "light",
      tokens: { "--phone-canvas": "white" },
      safeArea: { top: 0, bottom: 0 },
      reducedMotion: true,
    };
    message({
      channel: "moobi-preview-v1",
      session: "session",
      event: "environment",
      value: environment,
    });
    expect(sdk.getEnvironment()).toEqual(environment);
    expect(style.colorScheme).toBe("light");
    expect(style.setProperty).toHaveBeenCalledWith("--phone-canvas", "white");
    expect(style.setProperty).toHaveBeenCalledWith(
      "--phone-safe-area-top",
      "0px",
    );
    for (const event of ["launch", "pause", "resume", "back"]) {
      message({ channel: "moobi-preview-v1", session: "session", event });
      expect(listener).toHaveBeenLastCalledWith(event, undefined);
    }
    unsubscribe();
    listener.mockClear();
    message({
      channel: "moobi-preview-v1",
      session: "session",
      event: "pause",
    });
    expect(listener).not.toHaveBeenCalled();
  });
  it("only resolves storage writes after host acknowledgement and propagates failures", async () => {
    const { sdk, parent, listeners, reply } = await setup();
    listeners.get("load")?.();
    reply(1);
    await sdk.ready;
    const saving = sdk.storage.set("count", "2");
    expect(parent.postMessage).toHaveBeenLastCalledWith(
      {
        channel: "moobi-preview-v1",
        session: "session",
        id: 2,
        method: "storage.set",
        key: "count",
        value: "2",
      },
      "https://moobi.example",
    );
    reply(2, { ok: false, error: "Quota exceeded" });
    await expect(saving).rejects.toThrow("Quota exceeded");
    const reading = sdk.storage.get("count");
    reply(3, { value: "1" });
    await expect(reading).resolves.toBe("1");
  });
});

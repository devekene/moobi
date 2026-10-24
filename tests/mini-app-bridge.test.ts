import { describe, expect, it, vi } from "vitest";
import {
  authenticatePreviewMessage,
  createPreviewBridge,
  parsePreviewRequest,
  PREVIEW_CHANNEL,
} from "@/lib/mini-app-bridge";
import { SAMPLE_PACKAGE } from "@/lib/mini-app-sample";

const request = (id = 1, extra = {}) => ({
  channel: PREVIEW_CHANNEL,
  session: "session",
  id,
  method: "storage.get",
  key: "count",
  ...extra,
});
describe("preview SDK boundary", () => {
  it("authenticates exact frame, opaque origin, and session together", () => {
    const { port1, port2 } = new MessageChannel();
    const event = { source: port1, origin: "null", data: request() };
    expect(authenticatePreviewMessage(event, port1, "session")).not.toBeNull();
    expect(authenticatePreviewMessage(event, port2, "session")).toBeNull();
    expect(authenticatePreviewMessage(event, port1, "old-session")).toBeNull();
    expect(
      authenticatePreviewMessage(
        { ...event, origin: "https://moobi.example" },
        port1,
        "session",
      ),
    ).toBeNull();
    expect(
      authenticatePreviewMessage({ ...event, source: null }, null, "session"),
    ).toBeNull();
    port1.close();
    port2.close();
  });
  it.each([
    { appId: "other-app" },
    { method: "fetch" },
    { key: "__proto__" },
    { key: "constructor" },
    { id: NaN },
    { id: 0 },
    { id: 1.5 },
    { session: "stale" },
    { method: "storage.set", value: 8 },
    { method: "storage.set", value: "💾".repeat(1025) },
  ])("rejects forged or malformed request %j", (patch) => {
    expect(parsePreviewRequest(request(1, patch), "session")).toBeNull();
  });
  it("takes storage identity from the host package and rejects replay", async () => {
    const storage = vi.fn(async () => "7");
    const bridge = createPreviewBridge(SAMPLE_PACKAGE, "session", storage);
    expect(await bridge.receive(request())).toMatchObject({
      ok: true,
      value: "7",
    });
    expect(storage).toHaveBeenCalledWith(
      "example.counter",
      "get",
      "count",
      undefined,
    );
    expect(await bridge.receive(request())).toBeNull();
    expect(await bridge.receive(request(2, { appId: "notes" }))).toBeNull();
    expect(storage).toHaveBeenCalledTimes(1);
  });
  it("denies undeclared permissions", async () => {
    const storage = vi.fn(async () => null);
    const app = {
      ...SAMPLE_PACKAGE,
      manifest: { ...SAMPLE_PACKAGE.manifest, permissions: [] },
    };
    const bridge = createPreviewBridge(app, "session", storage);
    expect(await bridge.receive(request())).toMatchObject({
      ok: false,
      error: "Storage permission was not granted.",
    });
    expect(storage).not.toHaveBeenCalled();
  });
  it("does not acknowledge failed storage operations", async () => {
    const bridge = createPreviewBridge(SAMPLE_PACKAGE, "session", async () => {
      throw new Error("secret internal path");
    });
    const result = await bridge.receive(request());
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain("secret internal path");
  });
  it("revokes a closed session even while a storage operation is in flight", async () => {
    let finish: (value: string) => void = () => {};
    const storage = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const bridge = createPreviewBridge(SAMPLE_PACKAGE, "session", storage);
    const result = bridge.receive(request());
    await vi.waitFor(() => expect(storage).toHaveBeenCalledOnce());
    bridge.close();
    finish("private value");
    expect(await result).toBeNull();
    expect(await bridge.receive(request(2))).toBeNull();
  });
  it("bounds request rates", async () => {
    const bridge = createPreviewBridge(
      SAMPLE_PACKAGE,
      "session",
      async () => null,
    );
    for (let id = 1; id <= 30; id++)
      expect(await bridge.receive(request(id), 10_000)).toMatchObject({
        ok: true,
      });
    expect(await bridge.receive(request(31), 10_000)).toMatchObject({
      ok: false,
    });
    expect(await bridge.receive(request(32), 11_000)).toMatchObject({
      ok: true,
    });
  });
});

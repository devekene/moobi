import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beginBrowserVisit } from "@/lib/browser-visit";
import { deniesEmbedding } from "@/lib/browser-embedding";
import { publicProbeUrl, probeWebsite } from "@/lib/browser-probe";
import { lookup } from "node:dns/promises";
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
const mockFetch = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe("browser connection scene", () => {
  it("opens an embeddable page and cancels the loading fallback after load", async () => {
    mockFetch.mockResolvedValue(Response.json({ status: "ok" }));
    const stage = vi.fn();
    const open = vi.fn();
    const visit = beginBrowserVisit("https://example.com/", stage, open);
    await vi.advanceTimersByTimeAsync(0);
    expect(stage).toHaveBeenLastCalledWith("loading");
    visit.loaded();
    await vi.advanceTimersByTimeAsync(15000);
    expect(stage).toHaveBeenLastCalledWith("ready");
    expect(open).not.toHaveBeenCalled();
    visit.cancel();
  });
  it("shows the locked door before one external handoff", async () => {
    mockFetch.mockResolvedValue(Response.json({ status: "blocked" }));
    const stage = vi.fn();
    const open = vi.fn();
    const visit = beginBrowserVisit("https://example.com/", stage, open);
    await vi.advanceTimersByTimeAsync(0);
    expect(stage).toHaveBeenLastCalledWith("blocked");
    await vi.advanceTimersByTimeAsync(1000);
    expect(stage).toHaveBeenLastCalledWith("leaving");
    expect(open).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(900);
    expect(stage).toHaveBeenLastCalledWith("external");
    await vi.advanceTimersByTimeAsync(30000);
    expect(open).toHaveBeenCalledTimes(1);
    visit.cancel();
  });
  it("offers an external route when probing fails or page loading stalls", async () => {
    mockFetch.mockResolvedValue(Response.json({ status: "ok" }));
    const stage = vi.fn();
    const open = vi.fn();
    const visit = beginBrowserVisit("https://example.com/", stage, open);
    await vi.advanceTimersByTimeAsync(8900);
    expect(open).toHaveBeenCalledTimes(1);
    visit.cancel();
    mockFetch.mockRejectedValue(new Error("offline"));
    const retry = beginBrowserVisit("https://example.com/", stage, open);
    await vi.advanceTimersByTimeAsync(900);
    expect(open).toHaveBeenCalledTimes(2);
    retry.cancel();
  });
  it("cancels late responses and tab opening after navigation away", async () => {
    mockFetch.mockResolvedValue(Response.json({ status: "blocked" }));
    const stage = vi.fn();
    const open = vi.fn();
    const visit = beginBrowserVisit("https://example.com/", stage, open);
    await vi.advanceTimersByTimeAsync(0);
    visit.cancel();
    await vi.advanceTimersByTimeAsync(5000);
    expect(open).not.toHaveBeenCalled();
    expect(stage).toHaveBeenCalledTimes(1);
  });
});
describe("embedding headers", () => {
  const target = new URL("https://example.com");
  const parent = new URL("https://moobi.app");
  it("respects denied frames, same-origin and explicitly allowed ancestors", () => {
    expect(
      deniesEmbedding(
        new Headers({ "x-frame-options": "DENY" }),
        target,
        parent,
      ),
    ).toBe(true);
    expect(
      deniesEmbedding(
        new Headers({ "x-frame-options": "SAMEORIGIN" }),
        target,
        parent,
      ),
    ).toBe(true);
    expect(
      deniesEmbedding(
        new Headers({ "x-frame-options": "SAMEORIGIN" }),
        target,
        target,
      ),
    ).toBe(false);
    expect(
      deniesEmbedding(
        new Headers({ "content-security-policy": "frame-ancestors 'none'" }),
        target,
        parent,
      ),
    ).toBe(true);
    expect(
      deniesEmbedding(
        new Headers({
          "content-security-policy": "frame-ancestors https://moobi.app",
          "x-frame-options": "DENY",
        }),
        target,
        parent,
      ),
    ).toBe(false);
    expect(
      deniesEmbedding(
        new Headers({
          "content-security-policy": "frame-ancestors https://*.moobi.app",
        }),
        target,
        new URL("https://preview.moobi.app"),
      ),
    ).toBe(false);
    expect(
      deniesEmbedding(
        new Headers({ "content-security-policy": "default-src 'self'" }),
        target,
        parent,
      ),
    ).toBe(false);
  });
  it("probes HTTPS only and refuses private DNS destinations", async () => {
    expect(publicProbeUrl("http://example.com")).toBeNull();
    expect(publicProbeUrl("https://example.com:8080")).toBeNull();
    expect(publicProbeUrl("https://user:pass@example.com")).toBeNull();
    vi.mocked(lookup).mockResolvedValue({ address: "127.0.0.1", family: 4 });
    expect(
      await probeWebsite(
        "https://internal.example",
        parent,
        new AbortController().signal,
      ),
    ).toBe("unknown");
  });
});

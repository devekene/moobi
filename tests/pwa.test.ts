import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";
import {
  MOOBI_SERVICE_WORKER_URL,
  registerMoobiServiceWorker,
} from "@/lib/pwa";

const serviceWorkerSource = readFileSync(
  fileURLToPath(new URL("../public/sw.js", import.meta.url)),
  "utf8",
);

describe("Moobi PWA", () => {
  it("publishes an installable standalone manifest with dedicated icons", () => {
    expect(manifest()).toMatchObject({
      id: "/",
      short_name: "Moobi",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#000000",
      theme_color: "#000000",
    });
    expect(manifest().icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
  });

  it("registers one root-scoped worker without HTTP cache reuse", async () => {
    const register = vi.fn().mockResolvedValue(undefined);

    await registerMoobiServiceWorker({ register });

    expect(register).toHaveBeenCalledWith(MOOBI_SERVICE_WORKER_URL, {
      scope: "/",
      updateViaCache: "none",
    });
  });

  it("does nothing when service workers are unavailable", () => {
    expect(registerMoobiServiceWorker(undefined)).toBeUndefined();
  });

  it("limits offline caching to the shell and versioned static assets", () => {
    expect(serviceWorkerSource).toContain('url.pathname === "/"');
    expect(serviceWorkerSource).toContain(
      'url.pathname.startsWith("/_next/static/")',
    );
    expect(serviceWorkerSource).toContain(
      "SHELL_ASSET_PATHS.has(url.pathname)",
    );
    expect(serviceWorkerSource).not.toContain(
      'url.pathname.startsWith("/api/")',
    );
    expect(serviceWorkerSource).not.toContain("caches.match(request.url)");
  });
});

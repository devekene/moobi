import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRuntimeServer } from "../runtime/server.mjs";
import {
  buildPreviewDocument,
  encodeRuntimeDocument,
} from "@/lib/mini-app-runtime";
import { SAMPLE_PACKAGE } from "@/lib/mini-app-sample";

describe("cookie-free runtime response boundary", () => {
  const appOrigin = "https://moobi.example.test";
  const server = createRuntimeServer({ appOrigin });
  let origin = "";
  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No runtime address");
    origin = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    if (!server.listening) return;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  it("serves only the approved host with response-header sandbox/CSP and no cookies", async () => {
    const document = await buildPreviewDocument(
      SAMPLE_PACKAGE,
      "session",
      appOrigin,
    );
    const response = await fetch(`${origin}/render`, {
      method: "POST",
      headers: { Origin: appOrigin },
      body: new URLSearchParams({ document: encodeRuntimeDocument(document) }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain(
      "sandbox allow-scripts;",
    );
    expect(response.headers.get("content-security-policy")).toContain(
      `frame-ancestors ${appOrigin}`,
    );
    expect(response.headers.get("content-security-policy")).toContain(
      "connect-src 'none'",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe(document);
  });
  it("preserves CSP-hashed scripts through browser form newline normalization", async () => {
    const document = await buildPreviewDocument(
      SAMPLE_PACKAGE,
      "unicode-💾",
      appOrigin,
    );
    const encoded = encodeRuntimeDocument(document);
    expect(encoded).not.toMatch(/[\r\n]/);
    const normalized = encoded.replace(/\r?\n/g, "\r\n");
    const response = await fetch(`${origin}/render`, {
      method: "POST",
      headers: { Origin: appOrigin },
      body: new URLSearchParams({ document: normalized }),
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(document);
  });
  it("rejects unapproved origins, invalid documents, and arbitrary paths", async () => {
    expect(
      (
        await fetch(`${origin}/render`, {
          method: "POST",
          headers: { Origin: "https://attacker.example" },
          body: new URLSearchParams({ document: "<!doctype html>" }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(`${origin}/render`, {
          method: "POST",
          headers: { Origin: appOrigin },
          body: new URLSearchParams({ document: "bad" }),
        })
      ).status,
    ).toBe(400);
    expect((await fetch(`${origin}/private-files`)).status).toBe(404);
    const bootstrap = await fetch(`${origin}/bootstrap`);
    expect(bootstrap.status).toBe(200);
    expect(await bootstrap.text()).not.toContain("script");
  });
});

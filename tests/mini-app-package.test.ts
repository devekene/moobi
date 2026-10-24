import { describe, expect, it } from "vitest";
import {
  MAX_PACKAGE_BYTES,
  packageDigest,
  parseMiniAppPackage,
} from "@/lib/mini-app-package";
import { SAMPLE_PACKAGE } from "@/lib/mini-app-sample";
import {
  buildPreviewDocument,
  PREVIEW_CSP,
  PREVIEW_SANDBOX,
} from "@/lib/mini-app-runtime";
import { Script } from "node:vm";

const serialize = (value: unknown) => JSON.stringify(value);
describe("external preview package contract", () => {
  it("round-trips the downloadable sample without relying on a screen loader", () => {
    expect(parseMiniAppPackage(serialize(SAMPLE_PACKAGE))).toEqual(
      SAMPLE_PACKAGE,
    );
    expect(() => new Script(SAMPLE_PACKAGE.files["app.js"])).not.toThrow();
  });
  it.each(["", "{", "null", "[]", '{"formatVersion":2}'])(
    "rejects invalid envelope %s",
    (source) => {
      expect(() => parseMiniAppPackage(source)).toThrow();
    },
  );
  it("checks UTF-8 bytes before parsing", () => {
    expect(() =>
      parseMiniAppPackage("💾".repeat(MAX_PACKAGE_BYTES / 3)),
    ).toThrow("256 KiB");
  });
  it.each([
    { sdkVersion: 2 },
    { storageVersion: 0 },
    { storageVersion: -1 },
    { storageVersion: 1.5 },
    { storageVersion: "1" },
    { permissions: ["camera"] },
    { permissions: ["storage", "storage"] },
    { id: "../notes" },
    { id: "__proto__" },
    { name: " " },
    { name: "a".repeat(61) },
    { version: "1.0.0-beta" },
    { version: "01.0.0" },
    { entry: "https://example.com" },
    { extra: true },
  ])("rejects unsupported manifest fields %j", (patch) => {
    expect(() =>
      parseMiniAppPackage(
        serialize({
          ...SAMPLE_PACKAGE,
          manifest: { ...SAMPLE_PACKAGE.manifest, ...patch },
        }),
      ),
    ).toThrow();
  });
  it("rejects additional files, non-text files, and traversal paths", () => {
    for (const files of [
      { ...SAMPLE_PACKAGE.files, "../secret": "x" },
      { ...SAMPLE_PACKAGE.files, "app.js": {} },
    ])
      expect(() =>
        parseMiniAppPackage(serialize({ ...SAMPLE_PACKAGE, files })),
      ).toThrow();
  });
  it("identifies releases by app ID, version and package digest", async () => {
    const original = await packageDigest(SAMPLE_PACKAGE);
    expect(original).toMatch(/^[a-f0-9]{64}$/);
    expect(
      await packageDigest(parseMiniAppPackage(serialize(SAMPLE_PACKAGE))),
    ).toBe(original);
    expect(
      await packageDigest({
        ...SAMPLE_PACKAGE,
        files: { ...SAMPLE_PACKAGE.files, "app.js": "/* changed */" },
      }),
    ).not.toBe(original);
  });
});

describe("opaque-origin runtime document", () => {
  it("puts the fixed CSP before app content and keeps JS out of host HTML", async () => {
    const app = {
      ...SAMPLE_PACKAGE,
      files: {
        ...SAMPLE_PACKAGE.files,
        "app.js": '</script><img src="https://bad.example">',
      },
    };
    const html = await buildPreviewDocument(
      app,
      "session",
      "http://localhost:3000",
    );
    expect(PREVIEW_SANDBOX).toBe("allow-scripts");
    expect(html.indexOf(PREVIEW_CSP)).toBeLessThan(
      html.indexOf(app.files["index.html"]),
    );
    expect(html).not.toContain(app.files["app.js"]);
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("frame-src 'none'");
    expect(html).toContain("form-action 'none'");
    expect(html).not.toContain("'unsafe-eval'");
    const sdk = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(sdk).toBeDefined();
    const hash = Buffer.from(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sdk)),
    ).toString("base64");
    expect(html).toContain(`'sha256-${hash}'`);
  });
  it("has no dependency on HTTP resources for offline replay", async () => {
    const html = await buildPreviewDocument(
      SAMPLE_PACKAGE,
      "session",
      "http://localhost:3000",
    );
    const resources = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(resources).toHaveLength(2);
    expect(resources.every((url) => url.startsWith("data:"))).toBe(true);
  });
});

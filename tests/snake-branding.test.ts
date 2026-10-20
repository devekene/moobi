import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import SnakeIcon from "@/components/icons/SnakeIcon";
import StoreArtwork from "@/components/screens/app-store/StoreArtwork";
import { getMiniApp } from "@/lib/app-registry";

describe("Snake discovery artwork", () => {
  it("uses the character icon through the shared registry and store artwork", () => {
    expect(getMiniApp("snake").icon).toBe(SnakeIcon);
    const icon = renderToStaticMarkup(
      createElement(SnakeIcon, { size: 48, "aria-label": "Snake" }),
    );
    expect(icon).toContain('aria-label="Snake"');
    expect(icon).toContain('width="48"');
    expect(icon).toContain('viewBox="0 0 64 64"');
    const art = renderToStaticMarkup(
      createElement(StoreArtwork, { id: "snake" }),
    );
    expect(art).toContain('viewBox="0 0 64 64"');
  });
  it("ships current screenshots with a matching caption for each", () => {
    const app = getMiniApp("snake");
    const screenshots = app.previewCapabilities.screenshotUrls ?? [];
    expect(screenshots).toHaveLength(2);
    expect(app.store?.previewCaptions).toHaveLength(screenshots.length);
    for (const url of screenshots)
      expect(existsSync(join(process.cwd(), "public", url))).toBe(true);
    expect(screenshots).not.toContain(
      "/images/appstore/screenshots/snake-1.webp",
    );
  });
});

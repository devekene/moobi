import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import GuessIcon from "@/components/icons/GuessIcon";
import GuessGame from "@/components/screens/guess/GuessGame";
import StoreArtwork from "@/components/screens/app-store/StoreArtwork";
import { getMiniApp } from "@/lib/app-registry";

describe("Guess identity", () => {
  it("shares its scalable icon between the registry, game, and store", () => {
    expect(getMiniApp("guess").icon).toBe(GuessIcon);
    const icon = renderToStaticMarkup(
      createElement(GuessIcon, { size: 48, "aria-label": "Guess" }),
    );
    expect(icon).toContain('width="48"');
    expect(icon).toContain('aria-label="Guess"');
    for (const component of [
      createElement(GuessGame),
      createElement(StoreArtwork, { id: "guess" }),
    ]) {
      expect(renderToStaticMarkup(component)).toContain('viewBox="0 0 64 64"');
    }
  });
  it("ships refreshed discovery and decoder captures with matching captions", () => {
    const app = getMiniApp("guess");
    const screenshots = app.previewCapabilities.screenshotUrls ?? [];
    expect(screenshots).toEqual([
      "/images/appstore/screenshots/guess-discover.webp",
      "/images/appstore/screenshots/guess-decoder.webp",
    ]);
    expect(app.store?.previewCaptions).toHaveLength(screenshots.length);
    for (const url of screenshots)
      expect(existsSync(join(process.cwd(), "public", url))).toBe(true);
  });
});

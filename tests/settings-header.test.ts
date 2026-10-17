import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SettingsHeader from "@/components/screens/settings/SettingsHeader";

describe("Settings headers", () => {
  it("keeps the overview title without a back control", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsHeader, { title: "Settings" }),
    );
    expect(html).toContain(">Settings</h1>");
    expect(html).not.toContain("<button");
  });

  it("uses an accessible icon-only back button and one title for every detail screen", () => {
    for (const title of [
      "Display & Brightness",
      "Wallpaper",
      "Sounds & Haptics",
      "Battery",
      "Security",
      "About",
    ]) {
      const html = renderToStaticMarkup(
        createElement(SettingsHeader, { title, onBack: () => undefined }),
      );
      expect(html).toContain('aria-label="Back to Settings"');
      expect(html).toContain('aria-hidden="true"');
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      const button = html.match(/<button\b[^>]*>([\s\S]*?)<\/button>/)?.[1] ?? "";
      expect(button).toContain("<svg");
      expect(button.replace(/<[^>]*>/g, "")).toBe("");
    }
  });
});

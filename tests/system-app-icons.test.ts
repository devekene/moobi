import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CalculatorIcon,
  CalendarIcon,
  ClockIcon,
  GalleryIcon,
  SettingsIcon,
} from "@/components/icons/SystemAppIcons";
import AppIconArtwork from "@/components/icons/AppIconArtwork";
import AppIcon from "@/components/screens/app-store/AppIcon";
import { getMiniApp } from "@/lib/app-registry";

const iconEntries = [
  ["gallery", GalleryIcon],
  ["calendar", CalendarIcon],
  ["settings", SettingsIcon],
  ["clock", ClockIcon],
  ["calculator", CalculatorIcon],
] as const;

describe("system app icons", () => {
  it("uses the shared custom icon family from the app registry", () => {
    for (const [appId, Icon] of iconEntries) {
      expect(getMiniApp(appId).icon).toBe(Icon);
      expect(getMiniApp(appId).color).toContain("bg-transparent");
    }
    expect(getMiniApp("settings").iconPresentation).toBe("contained");
    for (const appId of [
      "gallery",
      "calendar",
      "clock",
      "calculator",
    ] as const) {
      expect(getMiniApp(appId).iconPresentation).toBe("full-bleed");
    }
  });

  it("renders each icon on the same scalable tile geometry", () => {
    for (const [appId, Icon] of iconEntries) {
      const markup = renderToStaticMarkup(
        createElement(Icon, { "aria-label": `${appId} icon` }),
      );
      expect(markup).toContain('viewBox="0 0 64 64"');
      expect(markup).toContain('width="1.7em"');
      expect(markup).toContain(`aria-label="${appId} icon"`);
      expect(markup).toContain(
        getMiniApp(appId).iconPresentation === "full-bleed"
          ? 'rx="18"'
          : 'rx="17"',
      );
    }
  });

  it("lets full-bleed artwork fill launcher and store icon containers", () => {
    const launcher = renderToStaticMarkup(
      createElement(AppIconArtwork, {
        icon: GalleryIcon,
        color: "bg-transparent",
        presentation: "full-bleed",
      }),
    );
    expect(launcher).toContain('data-icon-presentation="full-bleed"');
    expect(launcher).toContain("[&amp;&gt;svg]:h-full");

    const store = renderToStaticMarkup(
      createElement(AppIcon, { app: getMiniApp("gallery") }),
    );
    expect(store).toContain('data-presentation="full-bleed"');
  });

  it("keeps distinct color signatures for quick launcher recognition", () => {
    expect(renderToStaticMarkup(createElement(GalleryIcon))).toContain(
      "#a58bff",
    );
    expect(renderToStaticMarkup(createElement(CalendarIcon))).toContain(
      "#ef5465",
    );
    expect(renderToStaticMarkup(createElement(SettingsIcon))).toContain(
      "#4a4d59",
    );
    expect(renderToStaticMarkup(createElement(ClockIcon))).toContain("#28314c");
    expect(renderToStaticMarkup(createElement(CalculatorIcon))).toContain(
      "#f2a04f",
    );
  });
});

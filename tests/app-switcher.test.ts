import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { createAppPreviewStore } from "@/stores/useAppPreviewStore";
import { MINI_APPS } from "@/lib/app-registry";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppSwitcher from "@/components/screens/AppSwitcher";

vi.mock("@/public/images/wallpaper.webp", () => ({
  default: {
    src: "/wallpaper.webp",
    width: 400,
    height: 800,
    blurDataURL: "data:image/png;base64,iVBORw0KGgo=",
  },
}));

describe("app switcher navigation", () => {
  beforeEach(() =>
    usePhoneStore.setState({
      currentScreen: "home",
      lastScreen: "home",
      history: [],
      showAppSwitcher: false,
    }),
  );

  it("closing the active app removes it without adding it back to recents", () => {
    const phone = usePhoneStore.getState();
    phone.setCurrentScreen("notes");
    phone.setCurrentScreen("clock");
    phone.setShowAppSwitcher(true);
    phone.closeApp("clock");
    expect(usePhoneStore.getState()).toMatchObject({
      currentScreen: "home",
      lastScreen: "home",
      history: ["notes"],
      showAppSwitcher: true,
    });
  });

  it("closing a background app preserves the current app and closing the final app leaves an empty switcher", () => {
    const phone = usePhoneStore.getState();
    phone.setCurrentScreen("notes");
    phone.setCurrentScreen("clock");
    phone.setShowAppSwitcher(true);
    phone.closeApp("notes");
    expect(usePhoneStore.getState()).toMatchObject({
      currentScreen: "clock",
      history: ["clock"],
    });
    phone.closeApp("clock");
    expect(usePhoneStore.getState()).toMatchObject({
      currentScreen: "home",
      history: [],
      showAppSwitcher: true,
    });
  });

  it("close all returns home and clears recents and switcher atomically", () => {
    const phone = usePhoneStore.getState();
    phone.setCurrentScreen("notes");
    phone.setCurrentScreen("clock");
    phone.setShowAppSwitcher(true);
    phone.closeAllApps();
    expect(usePhoneStore.getState()).toMatchObject({
      currentScreen: "home",
      lastScreen: "home",
      history: [],
      showAppSwitcher: false,
    });
  });

  it("navigation dismisses the overlay and reopening a recent moves it to most recent", () => {
    const phone = usePhoneStore.getState();
    phone.setCurrentScreen("notes");
    phone.setCurrentScreen("clock");
    phone.setShowAppSwitcher(true);
    phone.setCurrentScreen("notes");
    expect(usePhoneStore.getState()).toMatchObject({
      currentScreen: "notes",
      history: ["clock", "notes"],
      showAppSwitcher: false,
    });
  });

  it("ignores attempts to close a system screen", () => {
    const phone = usePhoneStore.getState();
    phone.setCurrentScreen("screen-lock");
    phone.closeApp("screen-lock");
    expect(usePhoneStore.getState().currentScreen).toBe("screen-lock");
  });

  it("renders an accessible empty switcher without system-screen cards", () => {
    const markup = renderToStaticMarkup(createElement(AppSwitcher));
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("No recent apps");
    expect(markup).not.toContain("Close all");
  });
});

describe("session-only preview cache", () => {
  const image = new Blob(["preview"]);
  const setup = () => {
    let sequence = 0;
    const urls = {
      createObjectURL: vi.fn(() => `blob:${++sequence}`),
      revokeObjectURL: vi.fn(),
    };
    return { store: createAppPreviewStore(urls), urls };
  };

  it("releases replaced and closed app images", () => {
    const { store, urls } = setup();
    store.getState().save("notes", image);
    store.getState().save("notes", image);
    expect(urls.revokeObjectURL).toHaveBeenCalledWith("blob:1");
    store.getState().retain([]);
    expect(urls.revokeObjectURL).toHaveBeenCalledWith("blob:2");
    expect(store.getState().previews).toEqual({});
  });

  it("bounds the cache to eight app previews and preserves recent replacements", () => {
    const { store, urls } = setup();
    MINI_APPS.slice(0, 8).forEach((app) =>
      store.getState().save(app.id, image),
    );
    store.getState().save(MINI_APPS[0].id, image);
    store.getState().save(MINI_APPS[8].id, image);
    expect(Object.keys(store.getState().previews)).toHaveLength(8);
    expect(store.getState().previews[MINI_APPS[0].id]).toBe("blob:9");
    expect(store.getState().previews[MINI_APPS[1].id]).toBeUndefined();
    expect(urls.revokeObjectURL).toHaveBeenCalledWith("blob:2");
  });
});

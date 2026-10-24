import { afterEach, describe, expect, it, vi } from "vitest";
import { toBlob } from "html-to-image";
import {
  downloadPhoneDisplayScreenshot,
  downloadPhoneScreenshot,
} from "@/lib/phone-screenshot";

const saveScreenshot = vi.hoisted(() => vi.fn(async () => true));

vi.mock("@/stores/useGalleryStore", () => ({
  useGalleryStore: {
    getState: () => ({ saveScreenshot }),
  },
}));

vi.mock("html-to-image", () => ({
  toBlob: vi.fn(async () => new Blob(["png"])),
}));

describe("phone screenshot export", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("downloads the rendered device with its original renderer positioning", async () => {
    const link = {
      href: "",
      download: "",
      click: vi.fn(),
      remove: vi.fn(),
    };
    const appendChild = vi.fn();
    const createObjectURL = vi.fn(() => "blob:phone-screenshot");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("document", {
      createElement: vi.fn(() => link),
      body: { appendChild },
    });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("window", {
      setTimeout: (callback: () => void) => {
        callback();
        return 0;
      },
    });

    const phoneElement = {} as HTMLElement;
    const capturedAt = new Date("2026-10-14T03:42:16.046Z");
    const result = await downloadPhoneScreenshot(
      phoneElement,
      "screen-lock",
      capturedAt,
    );

    expect(toBlob).toHaveBeenCalledWith(
      phoneElement,
      expect.objectContaining({
        pixelRatio: 2,
        cacheBust: true,
      }),
    );
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(link.download).toBe(
      "moobi-screen-lock-2026-10-14T03-42-16-046Z.png",
    );
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:phone-screenshot");
    expect(saveScreenshot).toHaveBeenCalledWith(
      expect.any(Blob),
      "screen-lock",
      capturedAt,
    );
    expect(result).toEqual({
      filename: "moobi-screen-lock-2026-10-14T03-42-16-046Z.png",
      gallerySaved: true,
    });
  });

  it("captures only the display content within the requested phone", async () => {
    const display = {} as HTMLElement;
    const querySelector = vi
      .fn<HTMLElement["querySelector"]>()
      .mockReturnValue(display);
    const phoneRoot = { querySelector };
    const link = { click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal("document", {
      createElement: () => link,
      body: { appendChild: vi.fn() },
    });
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:display",
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("window", { setTimeout: vi.fn() });

    await downloadPhoneDisplayScreenshot(phoneRoot, "home");

    expect(querySelector).toHaveBeenCalledWith('[data-phone-display="true"]');
    expect(toBlob).toHaveBeenCalledWith(display, {
      pixelRatio: 2,
      cacheBust: true,
    });
    expect(link.click).toHaveBeenCalledOnce();
  });

  it("does not download when the display has not mounted", async () => {
    const phoneRoot = {
      querySelector: vi
        .fn<HTMLElement["querySelector"]>()
        .mockReturnValue(null),
    };
    await expect(
      downloadPhoneDisplayScreenshot(phoneRoot, "home"),
    ).rejects.toThrow("The phone display is not ready yet.");
    expect(toBlob).not.toHaveBeenCalled();
  });

  it("does not download an empty export", async () => {
    vi.mocked(toBlob).mockResolvedValueOnce(null);
    await expect(
      downloadPhoneScreenshot({} as HTMLElement, "home"),
    ).rejects.toThrow("The phone screenshot could not be created.");
    expect(saveScreenshot).not.toHaveBeenCalled();
  });
});

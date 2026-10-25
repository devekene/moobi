import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Frame from "@/components/screens/Frame";
import type VirtualIPhone from "@/components/screens/VirtualIPhone";
import { downloadPhoneDisplayScreenshot } from "@/lib/phone-screenshot";
import { usePhoneStore } from "@/stores";

const hardware = vi.hoisted(() => ({
  props: null as ComponentProps<typeof VirtualIPhone> | null,
  root: {} as HTMLDivElement,
}));

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useRef: <T>(initial: T) => ({
      current: initial === null ? hardware.root : initial,
    }),
  };
});
vi.mock("@/components/screens/VirtualIPhone", () => ({
  default: (props: ComponentProps<typeof VirtualIPhone>) => {
    hardware.props = props;
    return null;
  },
}));
vi.mock("@/context/ClockContext", () => ({
  useClock: () => ({ ringingAlarmId: null, silenceRingingAudio: () => false }),
}));
vi.mock("@/lib/phone-screenshot", () => ({
  downloadPhoneDisplayScreenshot: vi.fn(async () => ({
    filename: "moobi-home.png",
    gallerySaved: true,
  })),
}));

describe("right-side camera button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePhoneStore.setState({ currentScreen: "home", showControlCenter: true });
    renderToStaticMarkup(createElement(Frame, null, null));
  });

  it("keeps model and presentation controls out of the surrounding frame", () => {
    const html = renderToStaticMarkup(createElement(Frame, null, null));
    expect(html).not.toContain("virtual-iphone-model");
    expect(html).not.toContain("Show back");
    expect(html).not.toContain("Reset phone");
    expect(html).not.toContain("Phone options");
  });

  it("exports the current display without navigating or dismissing overlays", async () => {
    hardware.props?.onHardwareButton("camera-control");
    expect(downloadPhoneDisplayScreenshot).toHaveBeenCalledWith(
      hardware.root,
      "home",
    );
    expect(usePhoneStore.getState().currentScreen).toBe("home");
    expect(usePhoneStore.getState().showControlCenter).toBe(true);
    await vi.waitFor(() =>
      expect(downloadPhoneDisplayScreenshot).toHaveResolved(),
    );
  });

  it("ignores repeated presses during capture and allows retry after failure", async () => {
    let rejectCapture: (error: Error) => void = () => {};
    vi.mocked(downloadPhoneDisplayScreenshot).mockImplementationOnce(
      () =>
        new Promise<{ filename: string; gallerySaved: boolean }>(
          (_resolve, reject) => {
            rejectCapture = reject;
          },
        ),
    );
    hardware.props?.onHardwareButton("camera-control");
    hardware.props?.onHardwareButton("camera-control");
    expect(downloadPhoneDisplayScreenshot).toHaveBeenCalledOnce();
    rejectCapture(new Error("Export failed"));
    // Let the capture's catch/finally release the in-flight guard.
    await new Promise<void>((resolve) =>
      queueMicrotask(() => queueMicrotask(resolve)),
    );
    hardware.props?.onHardwareButton("camera-control");
    expect(downloadPhoneDisplayScreenshot).toHaveBeenCalledTimes(2);
  });
});

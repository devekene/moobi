import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const battery = vi.hoisted(() => ({
  level: 85,
  chargerPhase: "disconnected" as "disconnected" | "connecting" | "connected",
  lowBatteryDismissed: false,
}));
vi.mock("@/stores/useBatteryStore", () => ({
  useBatteryStore: <T>(select: (state: typeof battery) => T) => select(battery),
}));

import BatteryControls from "@/components/screens/BatteryControls";
import {
  DeviceSettings,
  DisplaySettings,
  SoundSettings,
  SecuritySettings,
} from "@/components/screens/settings/SettingsDetails";
import { useDeviceStore } from "@/stores/useDeviceStore";
import PinLockControls from "@/components/PinLockControls";
import InfoScreen from "@/components/screens/info/InfoScreen";

beforeEach(() => {
  battery.level = 85;
  battery.chargerPhase = "disconnected";
  battery.lowBatteryDismissed = false;
  useDeviceStore.setState({
    selectedModelId: "iphone-16",
    availableModelIds: ["iphone-16", "iphone-16-pro"],
  });
});

describe("Settings detail screens", () => {
  it("exposes the selected appearance and labelled brightness range", () => {
    const html = renderToStaticMarkup(createElement(DisplaySettings));
    const buttons = html.match(/<button\b[^>]*>/g) ?? [];
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toContain('aria-pressed="false"');
    expect(buttons[1]).toContain('aria-pressed="true"');
    expect(html).toContain('for="settings-screen-brightness"');
    expect(html).toContain('aria-valuetext="75 percent"');
  });

  it("gives silent mode switch semantics and explains simulated haptics", () => {
    const html = renderToStaticMarkup(createElement(SoundSettings));
    expect(html).toContain(
      'role="switch" aria-checked="false" aria-label="Silent mode"',
    );
    expect(html).toContain('for="settings-volume"');
    expect(html).toContain("hardware haptics are not used");
  });

  it("offers viewport-compatible virtual models inside Settings", () => {
    const html = renderToStaticMarkup(createElement(DeviceSettings));
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Virtual iPhone model"');
    expect(html).toContain('role="radio" aria-checked="true"');
    expect(html).toContain("iPhone 16 Pro");
    expect(html).toContain("iPhone 17 Pro Max");
  });

  it("shows battery level and a charger action without invented usage history", () => {
    const html = renderToStaticMarkup(createElement(BatteryControls));
    expect(html).toContain('aria-label="Virtual battery 85 percent"');
    expect(html).toContain("Connect charger");
    expect(html).toContain("Recharge to 100%");
  });

  it("prevents repeated connection requests during the connecting phase", () => {
    battery.chargerPhase = "connecting";
    const html = renderToStaticMarkup(createElement(BatteryControls));
    const buttons = html.match(/<button\b[^>]*>/g) ?? [];
    expect(buttons[0]).toContain('disabled=""');
    expect(html).toContain("Connecting charger…");
  });

  it("offers disconnect while charging and shows low-battery feedback until dismissed", () => {
    battery.chargerPhase = "connected";
    battery.level = 15;
    const html = renderToStaticMarkup(createElement(BatteryControls));
    expect(html).toContain("Disconnect charger");
    expect(html).toContain("Running low");
    battery.lowBatteryDismissed = true;
    expect(renderToStaticMarkup(createElement(BatteryControls))).not.toContain(
      "Running low",
    );
  });

  it("offers PIN setup in Settings and masks both setup fields", () => {
    expect(renderToStaticMarkup(createElement(SecuritySettings))).toContain(
      "Set up passcode",
    );
    const form = renderToStaticMarkup(
      createElement(PinLockControls, { setupOnly: true }),
    );
    expect(form.match(/type="password"/g)).toHaveLength(2);
    expect(form).toContain("Save passcode");
    expect(form).not.toContain("Turn passcode off");
  });

  it("keeps About content themeable and identifies simulation limits", () => {
    const html = renderToStaticMarkup(
      createElement(InfoScreen, { showHeading: false }),
    );
    expect(html).toContain("A little world of apps.");
    expect(html).toContain("do not change your actual device");
    expect(html).toContain("Epiphanus");
    expect(html).not.toContain("text-white");
  });
});

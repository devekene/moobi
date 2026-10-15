import { beforeEach, describe, expect, it } from "vitest";
import { MINI_APPS } from "@/lib/app-registry";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import { PHONE_LAUNCHER_PAGE_COUNT } from "@/lib/app-library";

describe("phone screen state", () => {
  beforeEach(() => {
    usePhoneStore.setState({
      currentScreen: "screen-boot",
      lastScreen: "home",
      phonePage: 0,
      history: [],
      showControlCenter: false,
      showAppSwitcher: false,
      passcodeEntryOpen: false,
    });
    usePhoneSettingsStore.setState({
      brightness: 75,
      volume: 62,
      volumeHudSource: null,
      silentMode: false,
      pinLockEnabled: false,
      pinCode: null,
    });
  });

  it("tracks the most recently opened app and moves it to the end of history", () => {
    const { setCurrentScreen } = usePhoneStore.getState();

    setCurrentScreen("notes");
    setCurrentScreen("weather");
    setCurrentScreen("notes");

    expect(usePhoneStore.getState()).toMatchObject({
      currentScreen: "notes",
      lastScreen: "weather",
      history: ["weather", "notes"],
    });
  });

  it("does not add system screens to app history", () => {
    const { setCurrentScreen } = usePhoneStore.getState();

    setCurrentScreen("notes");
    setCurrentScreen("home");
    setCurrentScreen("screen-lock");

    expect(usePhoneStore.getState()).toMatchObject({
      currentScreen: "screen-lock",
      history: ["notes"],
    });
  });

  it("allows paging to the App Library after the home app pages", () => {
    const { setPhonePage, fetchPhonePage } = usePhoneStore.getState();
    usePhoneStore.getState().setCurrentScreen("notes");
    setPhonePage(PHONE_LAUNCHER_PAGE_COUNT + 3);
    expect(usePhoneStore.getState().phonePage).toBe(
      PHONE_LAUNCHER_PAGE_COUNT - 1,
    );
    expect(usePhoneStore.getState().currentScreen).toBe("notes");

    setPhonePage(0);
    for (let page = 0; page < PHONE_LAUNCHER_PAGE_COUNT; page += 1) {
      fetchPhonePage("left");
    }
    expect(usePhoneStore.getState().phonePage).toBe(
      PHONE_LAUNCHER_PAGE_COUNT - 1,
    );
  });

  it("shows passcode entry over the lock screen without losing the app to unlock", () => {
    const { setCurrentScreen, setPasscodeEntryOpen } = usePhoneStore.getState();
    setCurrentScreen("notes");
    setCurrentScreen("screen-lock");
    setPasscodeEntryOpen(true);

    expect(usePhoneStore.getState()).toMatchObject({
      currentScreen: "screen-lock",
      lastScreen: "notes",
      passcodeEntryOpen: true,
    });

    setCurrentScreen("notes");
    expect(usePhoneStore.getState()).toMatchObject({
      currentScreen: "notes",
      passcodeEntryOpen: false,
    });
  });

  it("launches every registered target through the shared phone navigation owner", () => {
    for (const app of MINI_APPS) {
      usePhoneStore.getState().setCurrentScreen(app.launchTarget.screen);
    }

    const state = usePhoneStore.getState();
    expect(state.currentScreen).toBe("gallery");
    expect(state.history).toEqual(MINI_APPS.map((app) => app.id));
  });

  it("adjusts simulated media volume within bounds without changing the active app", () => {
    const { adjustVolume, setVolume } = usePhoneSettingsStore.getState();
    const { setCurrentScreen } = usePhoneStore.getState();
    setCurrentScreen("music-player");
    setVolume(98);
    adjustVolume(6);

    expect(usePhoneStore.getState().currentScreen).toBe("music-player");
    expect(usePhoneSettingsStore.getState().volume).toBe(100);

    setVolume(2);
    adjustVolume(-6);
    expect(usePhoneSettingsStore.getState().volume).toBe(0);
  });

  it("tracks which volume button is pressed for the volume HUD", () => {
    const { setVolumeHudSource } = usePhoneSettingsStore.getState();

    setVolumeHudSource("volume-up");
    expect(usePhoneSettingsStore.getState().volumeHudSource).toBe("volume-up");

    setVolumeHudSource("volume-down");
    expect(usePhoneSettingsStore.getState().volumeHudSource).toBe(
      "volume-down",
    );

    setVolumeHudSource("control-center");
    expect(usePhoneSettingsStore.getState().volumeHudSource).toBe(
      "control-center",
    );

    setVolumeHudSource(null);
    expect(usePhoneSettingsStore.getState().volumeHudSource).toBe(null);
  });

  it("toggles simulated silent mode without resetting phone navigation", () => {
    const { setCurrentScreen } = usePhoneStore.getState();
    const { toggleSilentMode } = usePhoneSettingsStore.getState();
    setCurrentScreen("music-player");
    toggleSilentMode();

    expect(usePhoneStore.getState().currentScreen).toBe("music-player");
    expect(usePhoneSettingsStore.getState().silentMode).toBe(true);
  });
});

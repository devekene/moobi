export type HomeIndicatorSwipeAction =
  "enter-passcode" | "show-app-switcher" | "go-home" | "none";

export const getHomeIndicatorSwipeAction = (
  currentScreen: string,
  pinLockEnabled: boolean,
  durationMs: number,
): HomeIndicatorSwipeAction => {
  if (currentScreen === "screen-lock") {
    return pinLockEnabled ? "enter-passcode" : "none";
  }
  return durationMs > 500 ? "show-app-switcher" : "go-home";
};

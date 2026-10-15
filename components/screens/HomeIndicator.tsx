import { useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import { getHomeIndicatorSwipeAction } from "@/lib/home-indicator";
import type { IPhoneDisplayMetrics } from "@/lib/iphone-models";

const HomeIndicator = ({ metrics }: { metrics: IPhoneDisplayMetrics }) => {
  const {
    currentScreen,
    setCurrentScreen,
    showAppSwitcher,
    setShowAppSwitcher,
    setPasscodeEntryOpen,
  } = usePhoneStore();
  const pinLockEnabled = usePhoneSettingsStore((state) => state.pinLockEnabled);
  const [swipeProgress, setSwipeProgress] = useState(0);

  const swipeStartTime = useRef<number | null>(null);

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      if (eventData.dir === "Up") {
        swipeStartTime.current ??= Date.now();
        const progress = Math.min(Math.abs(eventData.deltaY) / 48, 1);
        setSwipeProgress(progress);
      }
    },

    onSwiped: (eventData) => {
      if (eventData.dir === "Up") {
        const duration = Date.now() - (swipeStartTime.current ?? Date.now());
        swipeStartTime.current = null;
        const action = getHomeIndicatorSwipeAction(
          currentScreen,
          pinLockEnabled,
          duration,
        );
        if (action === "enter-passcode") {
          setSwipeProgress(0);
          setPasscodeEntryOpen(true);
        } else if (action === "show-app-switcher") {
          setShowAppSwitcher(true);
        } else if (action === "go-home") {
          setSwipeProgress(0);
          if (showAppSwitcher) setShowAppSwitcher(false);
          setCurrentScreen("home");
        } else {
          setSwipeProgress(0);
        }
      }
    },

    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 10,
  });

  const canEnterPasscode = currentScreen === "screen-lock" && pinLockEnabled;

  return (
    <div
      className="absolute left-1/2 z-50 flex w-[45%] max-w-44 -translate-x-1/2 items-end justify-center"
      style={{
        bottom: metrics.homeIndicatorBottom,
        height: 32 * metrics.uiScale,
        paddingBottom: 6 * metrics.uiScale,
      }}
      {...swipeHandlers}
    >
      <button
        type="button"
        onClick={() => {
          if (canEnterPasscode) setPasscodeEntryOpen(true);
        }}
        className={`relative w-[67%] max-w-32 touch-none rounded-full opacity-80 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${currentScreen === "screen-lock" ? "bg-white" : "bg-[var(--phone-text)]"}`}
        style={{ height: 4 * metrics.uiScale }}
        aria-label={
          canEnterPasscode
            ? "Swipe up or press to enter passcode"
            : "Home indicator"
        }
        aria-hidden={!canEnterPasscode}
        tabIndex={canEnterPasscode ? 0 : -1}
        data-no-turntable
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-full left-0 w-full rounded-t-full bg-[var(--phone-text)] transition-opacity duration-200 ease-in ${swipeProgress > 0 && showAppSwitcher ? "opacity-100" : "opacity-0"}`}
          style={{ height: `${swipeProgress * 100}%` }}
        />
      </button>
    </div>
  );
};
export default HomeIndicator;

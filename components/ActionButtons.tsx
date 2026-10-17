import {
  LuHouse,
  LuPower,
  LuPowerOff,
  LuSettings,
  LuTriangle,
} from "react-icons/lu";
import { useBrowserStore, useMusicStore, usePhoneStore } from "@/stores";
import { MusicPlayerScreen } from "@/types";
import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import PinLockControls from "@/components/PinLockControls";
import { cn } from "@/lib/utils";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ActionButtons = ({
  isOn,
  setIsOn,
}: {
  isOn: boolean;
  setIsOn: Dispatch<SetStateAction<boolean>>;
}) => {
  const {
    currentScreen,
    setLastScreen,
    showControlCenter,
    setCurrentScreen,
    lastScreen,
    toggleControlCenter,
    showAppSwitcher,
    setShowAppSwitcher,
  } = usePhoneStore();
  const pinLockEnabled = usePhoneSettingsStore((state) => state.pinLockEnabled);
  const pinCode = usePhoneSettingsStore((state) => state.pinCode);
  const setPinLock = usePhoneSettingsStore((state) => state.setPinLock);
  const disablePinLock = usePhoneSettingsStore((state) => state.disablePinLock);
  const { currentBrowserScreen, changeBrowserScreen } = useBrowserStore();
  const { currentPlayerScreen, setCurrentPlayerScreen } = useMusicStore();

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pinSetupOpen, setPinSetupOpen] = useState(false);

  const handlePressStart = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      togglePhoneState();
    }, 1000);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const handleClick = () => {
    handlePressEnd();

    if (currentScreen === "screen-shutdown" || currentScreen === "screen-boot")
      return;

    toggleScreenOnOff();
  };

  const toggleScreenOnOff = () => {
    if (isOn) {
      if (currentScreen !== "screen-lock") {
        setLastScreen(currentScreen);
      }

      if (showControlCenter) {
        toggleControlCenter();
      }

      setIsOn(false);
    } else {
      setIsOn(true);
      setCurrentScreen("screen-lock");
    }
  };

  const togglePhoneState = () => {
    if (currentScreen !== "screen-shutdown") {
      setLastScreen("home");
      setCurrentScreen("screen-shutdown");
    } else {
      setCurrentScreen("screen-boot");
    }
  };

  const backAction = () => {
    switch (currentScreen) {
      case "home":
        break;
      case "chrome-browser":
        if (currentBrowserScreen === "browser-frame") {
          changeBrowserScreen("browser-search-results");
        } else if (currentBrowserScreen !== "browser-home") {
          changeBrowserScreen("browser-home");
        } else {
          setCurrentScreen("home");
        }
        break;
      case "music-player":
        if (currentPlayerScreen === "nowPlaying") {
          setCurrentPlayerScreen(lastScreen as MusicPlayerScreen);
        } else {
          setCurrentScreen("home");
        }
        break;
      default:
        setCurrentScreen("home");
        break;
    }
  };

  const isCurrentlyOn = currentScreen !== "screen-shutdown" && isOn;

  const buttonStyle =
    "rounded-xl p-2 text-sm text-white transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--phone-focus)] disabled:text-gray-400 disabled:hover:bg-transparent";

  const closePinSetup = (open: boolean) => setPinSetupOpen(open);

  return (
    <div className="flex flex-row flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/15 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 p-1 shadow-lg sm:gap-2">
      <button
        onMouseDown={handlePressStart}
        onTouchStart={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchEnd={handlePressEnd}
        onClick={handleClick}
        className={buttonStyle}
        aria-label={isCurrentlyOn ? "Lock phone screen" : "Wake phone"}
      >
        {isCurrentlyOn ? <LuPowerOff size={19} /> : <LuPower size={19} />}
      </button>

      <button
        onClick={() => setCurrentScreen("home")}
        disabled={
          !isOn || currentScreen === "home" || currentScreen === "screen-lock"
        }
        className={buttonStyle}
        aria-label="Go to phone home"
      >
        <LuHouse size={19} />
      </button>

      <button
        title="Go Back"
        disabled={
          !isOn ||
          currentScreen === "home" ||
          currentScreen === "screen-lock" ||
          currentScreen === "screen-shutdown" ||
          currentScreen === "screen-boot"
        }
        onClick={backAction}
        className={cn("-rotate-90", buttonStyle)}
        aria-label="Go back"
      >
        <LuTriangle size={19} />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger className={buttonStyle} aria-label="Phone options">
          <LuSettings size={19} />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          onCloseAutoFocus={(event) => {
            if (usePhoneStore.getState().showAppSwitcher)
              event.preventDefault();
          }}
        >
          <DropdownMenuCheckboxItem
            checked={pinLockEnabled}
            onCheckedChange={(checked) => {
              if (!checked) {
                disablePinLock();
              } else if (pinCode !== null) {
                setPinLock(pinCode);
              } else {
                setPinSetupOpen(true);
              }
            }}
          >
            PIN lock
          </DropdownMenuCheckboxItem>
          {pinLockEnabled && pinCode !== null && (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setPinSetupOpen(true);
              }}
            >
              Change PIN…
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setShowAppSwitcher(!showAppSwitcher)}
          >
            {showAppSwitcher ? "Close" : "Open"} App Switcher
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleControlCenter}>
            {showControlCenter ? "Close" : "Open"} Control Center
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pinSetupOpen} onOpenChange={closePinSetup}>
        <DialogContent className="phone-theme max-w-sm border border-white/15 bg-[var(--phone-settings-group)] text-[var(--phone-text)]">
          <DialogHeader>
            <DialogTitle>
              {pinCode ? "Change PIN lock" : "Set up PIN lock"}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              This passcode is part of the browser simulation. It does not
              secure your device or data.
            </DialogDescription>
          </DialogHeader>
          <PinLockControls setupOnly onComplete={() => closePinSetup(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default ActionButtons;

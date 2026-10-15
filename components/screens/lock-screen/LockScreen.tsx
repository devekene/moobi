"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import lockscreen from "@/public/images/lockscreen.webp";
import { LuCamera, LuDelete, LuFlashlight, LuScanFace } from "react-icons/lu";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import { getLockScreenTimePresentation } from "@/lib/lock-screen";
import { appendPhonePinDigit, matchesPhonePin } from "@/lib/pin-lock";

const LOCK_CONTROL_CLASS =
  "flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-lg backdrop-blur-md transition-[background-color,transform,box-shadow] duration-150 hover:bg-black/50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none";

const LockScreen = ({
  notificationContent,
}: {
  notificationContent?: React.ReactNode;
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [hasScrollableNotifications, setHasScrollableNotifications] =
    useState(false);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const notificationFeedRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const {
    setCurrentScreen,
    lastScreen,
    passcodeEntryOpen,
    setPasscodeEntryOpen,
  } = usePhoneStore();
  const pinLockEnabled = usePhoneSettingsStore((state) => state.pinLockEnabled);
  const pinCode = usePhoneSettingsStore((state) => state.pinCode);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(timer);
      if (unlockTimer.current !== null) clearTimeout(unlockTimer.current);
    };
  }, []);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    const notificationFeed = notificationFeedRef.current;
    if (!viewport || !notificationFeed) {
      setHasScrollableNotifications(false);
      setScrollTop(0);
      return;
    }

    const updateOverflow = () => {
      const hasOverflow = viewport.scrollHeight > viewport.clientHeight + 1;
      setHasScrollableNotifications(hasOverflow);
      if (!hasOverflow) setScrollTop(0);
    };
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(viewport);
    observer.observe(notificationFeed);
    updateOverflow();
    return () => observer.disconnect();
  }, [notificationContent]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const unlockScreen = () => {
    if (isUnlocking) return;
    setPasscodeEntryOpen(false);
    setIsUnlocking(true);
    unlockTimer.current = setTimeout(
      () => {
        setIsUnlocking(false);
        setCurrentScreen(lastScreen);
      },
      shouldReduceMotion ? 0 : 600,
    );
  };

  const enterDigit = (digit: string) => {
    const nextPin = appendPhonePinDigit(enteredPin, digit);
    if (nextPin === null) return;
    setEnteredPin(nextPin);
    setPinError(false);
    if (nextPin.length === 4) {
      if (matchesPhonePin(nextPin, pinCode)) {
        unlockScreen();
      } else {
        setPinError(true);
        window.setTimeout(() => setEnteredPin(""), 350);
      }
    }
  };

  const { scale: timeScale, holdOffset: timeHoldOffset } =
    getLockScreenTimePresentation(scrollTop, hasScrollableNotifications);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: "easeOut" }}
      className="relative isolate h-full w-full overflow-hidden bg-black text-white"
    >
      <Image
        src={lockscreen.src}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, 400px"
        className="pointer-events-none z-0 object-cover"
        placeholder="blur"
        blurDataURL={lockscreen.blurDataURL}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-black/10 via-black/5 to-black/45"
      />

      <div
        ref={scrollViewportRef}
        className="absolute inset-0 z-10 [scrollbar-width:none] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        onScroll={(event) => {
          if (hasScrollableNotifications) {
            setScrollTop(event.currentTarget.scrollTop);
          }
        }}
      >
        <div className="relative min-h-full" style={{ paddingTop: "34%" }}>
          <header
            className="pointer-events-none flex flex-col items-center text-center text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)] transition-transform duration-75 ease-out motion-reduce:transition-none"
            style={{
              transform: `translateY(${timeHoldOffset}px) scale(${timeScale})`,
              transformOrigin: "center top",
            }}
          >
            <div className="mb-1 text-sm font-medium tracking-wide">
              {formatDate(currentTime)}
            </div>
            <time
              className="text-[clamp(4.5rem,27vw,7rem)] leading-[0.92] font-extralight tracking-[-0.075em] whitespace-nowrap tabular-nums"
              dateTime={currentTime.toISOString()}
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(255,255,255,.58), rgba(255,255,255,.28) 54%, rgba(255,255,255,.46))",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                WebkitTextStroke: "0.35px rgba(255,255,255,.14)",
                filter: "drop-shadow(0 2px 12px rgba(255,255,255,.12))",
              }}
            >
              {formatTime(currentTime)}
            </time>
          </header>
          {notificationContent != null && (
            <section
              ref={notificationFeedRef}
              aria-label="Notifications"
              className="mt-[18%] space-y-2 px-3 pb-4"
            >
              {notificationContent}
            </section>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsFlashlightOn((value) => !value)}
        className={`${LOCK_CONTROL_CLASS} absolute bottom-[8.5%] left-[13%] z-20 ${isFlashlightOn ? "border-white/75 bg-white/85 text-black shadow-[0_0_28px_rgba(255,255,255,0.4)] hover:bg-white" : ""}`}
        aria-label={
          isFlashlightOn
            ? "Turn simulated flashlight off"
            : "Turn simulated flashlight on"
        }
        aria-pressed={isFlashlightOn}
        title="Simulated flashlight"
        data-no-turntable
      >
        <LuFlashlight className="h-6 w-6" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={unlockScreen}
        disabled={isUnlocking}
        className="absolute bottom-[8.5%] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-white drop-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-80"
        aria-label={
          isUnlocking ? "Unlocking phone" : "Unlock phone with Face ID"
        }
        data-no-turntable
      >
        <LuScanFace className="h-6 w-6" aria-hidden="true" />
        <span className="text-[10px] font-medium">
          {isUnlocking ? "Unlocking" : "Face ID"}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setCurrentScreen("camera")}
        className={`${LOCK_CONTROL_CLASS} absolute right-[13%] bottom-[8.5%] z-20`}
        aria-label="Open camera preview"
        title="Open camera preview"
        data-no-turntable
      >
        <LuCamera className="h-6 w-6" aria-hidden="true" />
      </button>

      {passcodeEntryOpen && pinLockEnabled && (
        <div
          className="absolute inset-0 z-30 overflow-hidden text-white"
          data-no-turntable
        >
          <Image
            src={lockscreen.src}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="pointer-events-none scale-110 object-cover blur-2xl"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-xl"
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-[19%] flex flex-col items-center">
            <p className="mb-4 text-base font-medium tracking-wide">
              Enter Passcode
            </p>
            <div
              className="flex h-5 items-center gap-5"
              aria-label={`${enteredPin.length} of 4 digits entered`}
            >
              {[0, 1, 2, 3].map((index) => (
                <span
                  key={index}
                  className={`h-3.5 w-3.5 rounded-full border-2 border-white ${index < enteredPin.length && !pinError ? "bg-white" : "bg-transparent"} ${pinError ? "border-red-300" : ""}`}
                />
              ))}
            </div>
            <p className="sr-only" role="status" aria-live="polite">
              {pinError
                ? "Incorrect passcode. Try again."
                : `${enteredPin.length} of 4 passcode digits entered.`}
            </p>
            <div className="mt-3 h-5 text-sm text-red-100" aria-hidden="true">
              {pinError ? "Try Again" : ""}
            </div>
          </div>
          <div className="absolute inset-x-[12%] top-[38%] grid grid-cols-3 justify-items-center gap-x-3 gap-y-[3.5%]">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
              (digit, index) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => enterDigit(digit)}
                  className="flex aspect-square w-full max-w-[4.15rem] flex-col items-center justify-center rounded-full border border-white/10 bg-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,.16)] backdrop-blur-md transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-white active:scale-95 motion-reduce:transition-none"
                  aria-label={`Digit ${digit}${index > 0 ? `, ${["", "ABC", "DEF", "GHI", "JKL", "MNO", "PQRS", "TUV", "WXYZ"][index]}` : ""}`}
                >
                  <span className="text-[1.65rem] leading-none font-light">
                    {digit}
                  </span>
                  {index > 0 && (
                    <span className="mt-0.5 text-[0.43rem] leading-none tracking-[0.2em]">
                      {
                        [
                          "",
                          "ABC",
                          "DEF",
                          "GHI",
                          "JKL",
                          "MNO",
                          "PQRS",
                          "TUV",
                          "WXYZ",
                        ][index]
                      }
                    </span>
                  )}
                </button>
              ),
            )}
            <span aria-hidden="true" />
            <button
              type="button"
              onClick={() => enterDigit("0")}
              className="flex aspect-square w-full max-w-[4.15rem] items-center justify-center rounded-full border border-white/10 bg-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,.16)] backdrop-blur-md transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-white active:scale-95 motion-reduce:transition-none"
              aria-label="Digit 0"
            >
              <span className="text-[1.65rem] leading-none font-light">0</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEnteredPin((value) => value.slice(0, -1));
                setPinError(false);
              }}
              disabled={enteredPin.length === 0}
              className="flex aspect-square w-full max-w-[4.15rem] items-center justify-center rounded-full text-white/90 transition-opacity hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-0"
              aria-label="Delete last digit"
            >
              <LuDelete className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setPasscodeEntryOpen(false);
              setEnteredPin("");
              setPinError(false);
            }}
            className="absolute bottom-[8%] left-1/2 -translate-x-1/2 rounded-lg px-5 py-2 text-sm font-medium text-white/90 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Cancel
          </button>
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        Simulated flashlight {isFlashlightOn ? "on" : "off"}.
      </span>
    </motion.div>
  );
};

export default LockScreen;

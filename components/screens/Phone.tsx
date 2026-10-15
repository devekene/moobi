"use client";

import Loader from "@/components/Loader";
import Index from "@/components/screens/boot";
import Frame from "@/components/screens/Frame";
import { PhoneScreenBoundary } from "@/components/screens/PhoneScreenBoundary";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo } from "react";
import { getMiniApp, isMiniAppId, MINI_APPS } from "@/lib/app-registry";
import { usePhoneStore } from "@/stores/usePhoneStore";

const dynamicScreens = Object.fromEntries(
  MINI_APPS.map((app) => [
    app.id,
    dynamic(app.loadScreen, {
      loading: () => <Loader />,
      ssr: false,
    }),
  ]),
);
const LockScreen = dynamic(
  () => import("@/components/screens/lock-screen/LockScreen"),
  { loading: () => <Loader />, ssr: false },
);
const HomeScreen = dynamic(
  () => import("@/components/screens/home/HomeScreen"),
  {
    loading: () => <Loader />,
    ssr: false,
  },
);

const Phone = () => {
  const currentScreen = usePhoneStore((state) => state.currentScreen);
  const returnHome = () => usePhoneStore.getState().setCurrentScreen("home");
  const viewport = isMiniAppId(currentScreen)
    ? (getMiniApp(currentScreen).viewport ?? "contained")
    : "contained";

  const Screen = useMemo(
    () => (isMiniAppId(currentScreen) ? dynamicScreens[currentScreen] : null),
    [currentScreen],
  );

  useEffect(() => {
    void import("@/components/screens/home/HomeScreen");
  }, []);

  return (
    <div className="flex-center h-full flex-1 py-2">
      <Frame>
        <PhoneScreenBoundary resetKey={currentScreen} onReturnHome={returnHome}>
          {currentScreen === "screen-boot" ||
          currentScreen === "screen-shutdown" ? (
            <Index />
          ) : currentScreen === "screen-lock" ? (
            <LockScreen />
          ) : currentScreen === "home" ? (
            <HomeScreen />
          ) : Screen ? (
            <div className="phone-app-safe-area" data-layout={viewport}>
              <Screen />
            </div>
          ) : (
            <Index />
          )}
        </PhoneScreenBoundary>
      </Frame>
    </div>
  );
};

export default Phone;

"use client";

import { useSyncExternalStore } from "react";
import { isPhoneBrowser } from "@/lib/browser-device";

const subscribe = () => () => {};
const getSnapshot = () => isPhoneBrowser(navigator);
// Hide optional frame controls until the browser is known, avoiding a phone flash.
const getServerSnapshot = () => true;

export const useIsPhoneBrowser = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

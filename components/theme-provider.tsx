"use client";

import { useEffect, type ReactNode } from "react";
import { encryptedStorage } from "@/lib/encrypted-storage";

// The website has no theme picker. Retain its legacy preference without the
// third-party provider's unencrypted localStorage access.
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;
    void Promise.resolve(encryptedStorage.getItem("theme"))
      .then((saved) => {
        if (!active) return;
        const preference: unknown = saved ? JSON.parse(saved) : "dark";
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const apply = () => {
          const dark =
            preference === "system" ? media.matches : preference !== "light";
          document.documentElement.classList.toggle("dark", dark);
          document.documentElement.classList.toggle("light", !dark);
          document.documentElement.style.colorScheme = dark ? "dark" : "light";
        };
        apply();
        if (preference === "system") {
          media.addEventListener("change", apply);
          cleanup = () => media.removeEventListener("change", apply);
        }
      })
      .catch(() => {
        /* StorageBoundary reports storage failures. */
      });
    return () => {
      active = false;
      cleanup?.();
    };
  }, []);
  return children;
}

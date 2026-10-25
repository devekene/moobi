"use client";

import { useEffect } from "react";
import { registerMoobiServiceWorker } from "@/lib/pwa";

export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    const registration = registerMoobiServiceWorker(navigator.serviceWorker);
    if (!registration) return;

    void registration.catch((error) => {
      console.error("Moobi could not enable offline startup.", error);
    });
  }, []);

  return null;
}

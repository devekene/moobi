"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LuX } from "react-icons/lu";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { useAppPreviewStore } from "@/stores/useAppPreviewStore";
import { usePhoneApps } from "@/hooks/usePhoneApps";
import type { PhoneAppId } from "@/lib/phone-apps";
import AppIconArtwork from "@/components/icons/AppIconArtwork";
import HomeWallpaper from "@/components/screens/home/HomeWallpaper";

const AppSwitcher = () => {
  const {
    history,
    currentScreen,
    setCurrentScreen,
    closeApp,
    setShowAppSwitcher,
  } = usePhoneStore();
  const apps = usePhoneApps();
  const appById = new Map(apps.map((app) => [app.id, app]));
  const getApp = (id: PhoneAppId) => {
    const app = appById.get(id);
    if (!app) throw new Error("Installed app is unavailable.");
    return app;
  };
  const previews = useAppPreviewStore((state) => state.previews);
  const screens = [
    ...new Set(
      [...history, currentScreen].filter((id): id is PhoneAppId =>
        apps.some((app) => app.id === id),
      ),
    ),
  ].reverse();
  const dialog = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const reducedMotion = useReducedMotion();
  const [announcement, setAnnouncement] = useState("");
  const close = () => setShowAppSwitcher(false);
  const home = () => {
    setCurrentScreen("home");
    close();
  };

  useEffect(() => {
    const previous = document.activeElement;
    const frame = requestAnimationFrame(() => {
      const target =
        dialog.current?.querySelector<HTMLButtonElement>("[data-open-app]") ??
        dialog.current?.querySelector<HTMLButtonElement>(
          'button:not([tabindex="-1"])',
        );
      target?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (screens.length === 0) {
      dialog.current
        ?.querySelector<HTMLButtonElement>("[data-switcher-home]")
        ?.focus({ preventScroll: true });
    }
  }, [screens.length]);

  const dismiss = (screen: PhoneAppId) => {
    closeApp(screen);
    setAnnouncement(`${getApp(screen).name} closed.`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
    if (event.key === "Tab") {
      const controls = Array.from(
        dialog.current?.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled):not([tabindex="-1"])',
        ) ?? [],
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    const offset =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (offset) {
      const cards = Array.from(
        rail.current?.querySelectorAll<HTMLButtonElement>("[data-open-app]") ??
          [],
      );
      const index = cards.findIndex((card) => card === document.activeElement);
      if (index >= 0) {
        event.preventDefault();
        const card =
          cards[Math.min(cards.length - 1, Math.max(0, index + offset))];
        card?.focus({ preventScroll: true });
        card?.scrollIntoView({
          behavior: reducedMotion ? "instant" : "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  };

  return (
    <motion.div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label="Recent apps"
      aria-describedby="app-switcher-hint"
      data-no-turntable
      onKeyDown={onKeyDown}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.18 }}
      className="[container-type:size] absolute inset-0 z-40 overflow-hidden text-[var(--phone-text)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 scale-110 bg-[var(--phone-canvas)] blur-2xl"
      >
        <HomeWallpaper fullOpacity />
      </div>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Return to Home Screen"
        onClick={home}
        className="absolute inset-0 bg-[var(--phone-overlay)]/35 backdrop-blur-xl"
      />

      {screens.length ? (
        <div
          ref={rail}
          // Keep the scroll clip at the display edges. Internal spacing places
          // resting cards below the chrome while upward drags pass behind it.
          className="absolute inset-0 flex snap-x snap-mandatory [scrollbar-width:none] items-stretch overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
          style={{
            paddingTop:
              "calc(max(calc(var(--phone-safe-area-top) + 16px), 10cqh) + 4px)",
            paddingBottom:
              "calc(max(calc(var(--phone-safe-area-bottom) + 38px), 9cqh) + 12px)",
          }}
        >
          <div aria-hidden="true" className="w-[12cqw] shrink-0" />
          <AnimatePresence
            initial={false}
            onExitComplete={() => {
              if (!dialog.current?.contains(document.activeElement)) {
                const target =
                  dialog.current?.querySelector<HTMLButtonElement>(
                    "[data-open-app]",
                  ) ??
                  dialog.current?.querySelector<HTMLButtonElement>(
                    "[data-switcher-home]",
                  );
                target?.focus({ preventScroll: true });
              }
            }}
          >
            {screens.map((screen, index) => {
              const app = getApp(screen);
              return (
                <motion.article
                  key={screen}
                  layout={!reducedMotion}
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reducedMotion ? 0 : -240 }}
                  transition={{ duration: reducedMotion ? 0 : 0.22 }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.7, bottom: 0.04 }}
                  dragMomentum={false}
                  onDragStart={() => {
                    dragged.current = true;
                  }}
                  onDragEnd={(_, info) => {
                    if (
                      info.offset.y < -65 ||
                      (info.offset.y < -20 && info.velocity.y < -600)
                    )
                      dismiss(screen);
                    window.setTimeout(() => {
                      dragged.current = false;
                    }, 0);
                  }}
                  className="relative flex w-[76cqw] shrink-0 snap-center flex-col"
                  style={{
                    zIndex: index + 1,
                    marginRight: index === screens.length - 1 ? 0 : "-12cqw",
                  }}
                >
                  <div
                    className="mb-2 flex h-10 shrink-0 items-center gap-2.5 px-3"
                    style={{
                      paddingRight:
                        index < screens.length - 1 ? "calc(12cqw + 12px)" : 12,
                    }}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--phone-surface-elevated)] text-lg shadow-sm">
                      <AppIconArtwork
                        icon={app.icon}
                        color={app.color}
                        presentation={app.iconPresentation}
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
                      {app.name}
                    </span>
                    <button
                      type="button"
                      aria-label={`Close ${app.name}`}
                      onClick={() => dismiss(screen)}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--phone-surface)]/60 text-[var(--phone-text-secondary)] backdrop-blur-md"
                    >
                      <LuX className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    type="button"
                    data-open-app={screen}
                    aria-label={`Open ${app.name}${app.availability === "preview" ? ", preview only" : ""}`}
                    onClick={() => {
                      if (!dragged.current) {
                        setCurrentScreen(screen);
                        close();
                      }
                    }}
                    className="relative min-h-0 flex-1 overflow-hidden rounded-[9cqw] border border-[var(--phone-border)]/35 bg-[var(--phone-canvas)] text-left shadow-[0_14px_40px_rgba(0,0,0,0.3)] focus-visible:outline-offset-[-4px]"
                  >
                    {previews[screen] ? (
                      <Image
                        src={previews[screen]}
                        alt=""
                        fill
                        unoptimized
                        sizes="320px"
                        draggable={false}
                        className="pointer-events-none object-fill"
                      />
                    ) : (
                      <span className="flex h-full flex-col items-center justify-center gap-4 bg-linear-to-b from-[var(--phone-surface-elevated)] to-[var(--phone-canvas)] p-6 text-center">
                        <span className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-[var(--phone-surface)] text-4xl">
                          <AppIconArtwork
                            icon={app.icon}
                            color={app.color}
                            presentation={app.iconPresentation}
                          />
                        </span>
                        <span className="text-lg font-semibold">
                          {app.name}
                        </span>
                        <span className="text-xs text-[var(--phone-text-muted)]">
                          {app.availability === "preview"
                            ? "Preview only"
                            : "Open to view app"}
                        </span>
                      </span>
                    )}
                  </button>
                </motion.article>
              );
            })}
          </AnimatePresence>
          <div aria-hidden="true" className="w-[12cqw] shrink-0" />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
          <p className="text-xl font-semibold">No recent apps</p>
          <p className="text-sm text-[var(--phone-text-secondary)]">
            Apps you open appear here.
          </p>
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </motion.div>
  );
};

export default AppSwitcher;

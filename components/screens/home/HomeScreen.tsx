"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LuMinus, LuPencil } from "react-icons/lu";
import { useSwipeable } from "react-swipeable";
import HomeWallpaper from "@/components/screens/home/HomeWallpaper";
import WeatherWidget from "@/components/screens/weather-app/WeatherWidget";
import CalendarWidget from "@/components/screens/calendar/CalendarWidget";
import AppLibrary from "@/components/screens/home/AppLibrary";
import { cn } from "@/lib/utils";
import { getMiniApp } from "@/lib/app-registry";
import {
  APP_LIBRARY_PAGE_INDEX,
  HOME_SCREEN_PAGE_COUNT,
  PHONE_LAUNCHER_PAGE_COUNT,
} from "@/lib/app-library";
import {
  DOCK_APP_IDS,
  moveHomeApp,
  reconcileHomeAppOrder,
} from "@/lib/home-screen";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { useHomeScreenStore } from "@/stores/useHomeScreenStore";
import { usePhoneApps } from "@/hooks/usePhoneApps";
import AppIconArtwork from "@/components/icons/AppIconArtwork";
import { isPhoneAppId, type PhoneAppId, type PhoneApp } from "@/lib/phone-apps";

const dockAppIdSet = new Set<PhoneAppId>(DOCK_APP_IDS);

type DragSource = { appId: PhoneAppId; group: string };

const HomeScreen = () => {
  const phoneApps = usePhoneApps();
  const pages = useMemo(
    () =>
      Array.from({ length: HOME_SCREEN_PAGE_COUNT }, (_, page) =>
        phoneApps.filter((app) => app.homePage === page),
      ),
    [phoneApps],
  );
  const { setCurrentScreen, fetchPhonePage, setPhonePage, phonePage } =
    usePhoneStore();
  const { appOrders, dockOrder, setAppOrder, setDockOrder } =
    useHomeScreenStore();
  const [isEditing, setIsEditing] = useState(false);
  const [draggingAppId, setDraggingAppId] = useState<PhoneAppId | null>(null);
  const [now, setNow] = useState(() => new Date());
  const longPressTimer = useRef<number | null>(null);
  const pointerOrigin = useRef<{ id: number; x: number; y: number } | null>(
    null,
  );
  const draggedApp = useRef<DragSource | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const orderedPages = useMemo(
    () =>
      pages.map((apps, page) => {
        const appById = new Map(apps.map((app) => [app.id, app]));
        return reconcileHomeAppOrder(
          apps.map((app) => app.id),
          appOrders[String(page)] ?? [],
        )
          .map((id) => appById.get(id))
          .filter((app): app is PhoneApp => app !== undefined);
      }),
    [appOrders, pages],
  );
  const visiblePages = useMemo(
    () =>
      orderedPages.map((apps) =>
        apps.filter((app) => !dockAppIdSet.has(app.id)),
      ),
    [orderedPages],
  );
  const homeSurfaceIndexes = useMemo(
    () => Array.from({ length: PHONE_LAUNCHER_PAGE_COUNT }, (_, page) => page),
    [],
  );
  const orderedDockApps = useMemo(
    () =>
      reconcileHomeAppOrder(DOCK_APP_IDS, dockOrder).map((id) =>
        getMiniApp(id),
      ),
    [dockOrder],
  );

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isEditing) fetchPhonePage("left");
    },
    onSwipedRight: () => {
      if (!isEditing) fetchPhonePage("right");
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 10,
  });

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const stopEditing = () => {
    clearLongPress();
    draggedApp.current = null;
    pointerOrigin.current = null;
    setDraggingAppId(null);
    setIsEditing(false);
  };

  const saveReorder = (source: DragSource, targetId: PhoneAppId) => {
    if (source.appId === targetId) return;
    if (source.group === "dock") {
      const next = moveHomeApp(
        orderedDockApps.map((app) => app.id),
        source.appId,
        targetId,
      );
      setDockOrder(next);
      return;
    }

    const pageMatch = /^page-(\d+)$/.exec(source.group);
    if (!pageMatch) return;
    const page = Number(pageMatch[1]);
    const apps = visiblePages[page];
    if (!apps) return;
    setAppOrder(
      page,
      moveHomeApp(
        apps.map((app) => app.id),
        source.appId,
        targetId,
      ),
    );
  };

  const beginPointer = (
    event: ReactPointerEvent<HTMLButtonElement>,
    appId: PhoneAppId,
    group: string,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerOrigin.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };

    if (isEditing) {
      draggedApp.current = { appId, group };
      setDraggingAppId(appId);
      return;
    }

    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      suppressClick.current = true;
      draggedApp.current = { appId, group };
      setDraggingAppId(appId);
      setIsEditing(true);
    }, 450);
  };

  const movePointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const origin = pointerOrigin.current;
    if (!origin || origin.id !== event.pointerId) return;

    if (!draggedApp.current) {
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 12) {
        clearLongPress();
      }
      return;
    }

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-home-app-id]");
    const targetId = target?.dataset.homeAppId;
    const targetGroup = target?.dataset.homeAppGroup;
    if (
      targetGroup === draggedApp.current.group &&
      targetId !== undefined &&
      isPhoneAppId(targetId)
    ) {
      saveReorder(draggedApp.current, targetId);
    }
  };

  const endPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerOrigin.current?.id !== event.pointerId) return;
    clearLongPress();
    pointerOrigin.current = null;
    draggedApp.current = null;
    setDraggingAppId(null);
  };

  const openApp = (app: PhoneApp) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (isEditing) return;
    setCurrentScreen(app.launchTarget.screen);
  };

  const reorderWithKeyboard = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    appId: PhoneAppId,
    group: string,
  ) => {
    if (event.key === "F2" && !isEditing) {
      event.preventDefault();
      setIsEditing(true);
      setDraggingAppId(appId);
      return;
    }
    if (!isEditing) return;

    const offsets: Record<string, number> =
      group === "dock"
        ? { ArrowLeft: -1, ArrowRight: 1 }
        : { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 };
    const offset = offsets[event.key];
    if (offset === undefined) return;

    const ids =
      group === "dock"
        ? orderedDockApps.map((app) => app.id)
        : visiblePages[Number(group.slice("page-".length))]?.map(
            (app) => app.id,
          );
    if (!ids) return;
    const from = ids.indexOf(appId);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= ids.length) return;
    event.preventDefault();
    saveReorder({ appId, group }, ids[to]);
  };

  const appIcon = (app: PhoneApp, isDock = false, page = phonePage) => {
    const group = isDock ? "dock" : `page-${page}`;
    return (
      <button
        key={app.id}
        type="button"
        data-home-app-id={app.id}
        data-home-app-group={group}
        aria-label={`${app.name}${app.availability === "preview" ? ", preview only" : ""}${isEditing ? ", rearrange mode" : ""}`}
        title={
          app.availability === "preview" ? `${app.name} preview` : app.name
        }
        className={cn(
          "relative flex w-full min-w-0 touch-none flex-col items-center gap-1 rounded-xl px-0 py-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          isEditing &&
            "motion-safe:animate-home-wiggle motion-reduce:animate-none",
          draggingAppId === app.id && "scale-110 opacity-75",
        )}
        onPointerDown={(event) => beginPointer(event, app.id, group)}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onContextMenu={(event) => {
          event.preventDefault();
          setIsEditing(true);
        }}
        onKeyDown={(event) => reorderWithKeyboard(event, app.id, group)}
        onClick={() => openApp(app)}
      >
        <span className="relative flex aspect-square w-[clamp(2.75rem,20cqw,4.25rem)] items-center justify-center rounded-[17px] border border-white/25 bg-white/25 shadow-lg backdrop-blur-sm">
          <AppIconArtwork
            icon={app.icon}
            color={app.color}
            presentation={app.iconPresentation}
            className="rounded-[15px] text-[1.75rem]"
          />
          {isEditing && (
            <span
              aria-hidden="true"
              className="absolute -top-1.5 -left-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/80 bg-[var(--phone-surface-elevated)] text-[var(--phone-text)] shadow"
            >
              <LuMinus className="h-3 w-3" />
            </span>
          )}
        </span>
        {!isDock && (
          <span className="max-w-full truncate text-[11px] leading-tight text-[var(--phone-text)] drop-shadow-[0_1px_3px_rgba(0,0,0,.85)]">
            {app.name}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="[container-type:inline-size] relative h-full w-full overflow-hidden text-[var(--phone-text)] [--home-dock-bottom:12px] [--home-dock-height:calc(clamp(2.75rem,20cqw,4.25rem)+2rem)]"
      {...swipeHandlers}
    >
      <HomeWallpaper />

      {isEditing && (
        <div className="absolute top-[calc(var(--phone-safe-area-top)+8px)] right-4 left-4 z-30 flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-[var(--phone-surface-elevated)]/80 px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md">
            <LuPencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </span>
          <button
            type="button"
            onClick={stopEditing}
            className="rounded-full bg-[var(--phone-surface-elevated)]/90 px-4 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Done
          </button>
        </div>
      )}

      <div
        className="absolute inset-0 z-10 flex h-full transition-transform duration-300 ease-in-out motion-reduce:transition-none"
        style={{
          width: `${homeSurfaceIndexes.length * 100}%`,
          transform: `translateX(-${(phonePage * 100) / homeSurfaceIndexes.length}%)`,
        }}
      >
        {homeSurfaceIndexes.map((page) => (
          <section
            key={page}
            aria-label={
              page < APP_LIBRARY_PAGE_INDEX
                ? `Home screen page ${page + 1}`
                : "App Library"
            }
            className="relative h-full shrink-0"
            style={{ width: `${100 / homeSurfaceIndexes.length}%` }}
          >
            <div
              className={cn(
                "absolute inset-x-0 [scrollbar-width:none] overscroll-contain [&::-webkit-scrollbar]:hidden",
                page === APP_LIBRARY_PAGE_INDEX
                  ? "inset-y-0 overflow-hidden"
                  : cn(
                      "bottom-[calc(var(--home-dock-bottom)+var(--home-dock-height)+48px)] overflow-y-auto",
                      isEditing
                        ? "top-[calc(var(--phone-safe-area-top)+56px)]"
                        : "top-[calc(var(--phone-safe-area-top)+8px)]",
                    ),
              )}
              style={
                page === APP_LIBRARY_PAGE_INDEX
                  ? undefined
                  : { paddingInline: "6%" }
              }
            >
              {page === APP_LIBRARY_PAGE_INDEX ? (
                <AppLibrary onLaunch={openApp} />
              ) : (
                <div className="grid grid-cols-4 content-start gap-x-[1%] gap-y-[clamp(0.75rem,3.5cqw,1rem)] pb-3">
                  {page === 0 && (
                    <div
                      className="col-span-4 grid grid-cols-2"
                      style={{ columnGap: "clamp(12px, 4cqw, 18px)" }}
                    >
                      <div className="min-w-0">
                        <WeatherWidget size="small" />
                      </div>

                      <div className="min-w-0">
                        <CalendarWidget
                          date={now}
                          onOpen={() => setCurrentScreen("calendar")}
                        />
                        <span
                          aria-hidden="true"
                          style={{
                            display: "block",
                            marginTop: 5,
                            textAlign: "center",
                            fontSize: 10,
                            lineHeight: "13px",
                            fontWeight: 550,
                            color: "var(--phone-on-accent)",
                            textShadow: "0 1px 4px rgb(0 0 0 / 75%)",
                          }}
                        >
                          Calendar
                        </span>
                      </div>
                    </div>
                  )}

                  {visiblePages[page]?.map((app) => appIcon(app, false, page))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {isEditing && (
        <p className="sr-only" role="status" aria-live="polite">
          Home screen edit mode. Use the arrow keys to move the selected app, or
          drag an icon to rearrange it. Press Done to finish.
        </p>
      )}
      {!isEditing && (
        <p className="sr-only">
          Long press an app icon to rearrange apps. Press F2 while an app is
          focused to enter edit mode.
        </p>
      )}

      {phonePage < HOME_SCREEN_PAGE_COUNT && (
        <div className="absolute bottom-[calc(var(--home-dock-bottom)+var(--home-dock-height)+12px)] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 backdrop-blur-md">
          {visiblePages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPhonePage(index)}
              aria-label={`Go to home screen page ${index + 1}`}
              aria-current={phonePage === index ? "page" : undefined}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-[width,background-color] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white motion-reduce:transition-none",
                phonePage === index
                  ? "w-4 bg-white"
                  : "bg-white/60 hover:bg-white/85",
              )}
            />
          ))}
        </div>
      )}

      {phonePage < HOME_SCREEN_PAGE_COUNT && (
        <div className="absolute inset-x-3 bottom-[var(--home-dock-bottom)] z-20 flex h-[var(--home-dock-height)] items-center justify-center rounded-[2rem] border border-[var(--phone-text)]/20 bg-[var(--phone-surface-elevated)]/30 bg-linear-to-b from-[var(--phone-text)]/10 to-transparent p-3 shadow-lg backdrop-blur-2xl backdrop-saturate-150">
          {orderedDockApps.map((app) => appIcon(app, true))}
        </div>
      )}
    </div>
  );
};

export default HomeScreen;

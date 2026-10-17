"use client";

import { useEffect, type RefObject } from "react";
import { isMiniAppId } from "@/lib/app-registry";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { useAppPreviewStore } from "@/stores/useAppPreviewStore";

export function useAppPreviews(viewport: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    let disposed = false;
    let capturing = false;
    let activeHost: HTMLElement | null = null;
    const unsubscribe = usePhoneStore.subscribe((next, previous) => {
      useAppPreviewStore.getState().retain(next.history);
      const screen = previous.currentScreen;
      if (
        disposed ||
        capturing ||
        document.visibilityState !== "visible" ||
        !isMiniAppId(screen) ||
        !next.history.includes(screen) ||
        (next.currentScreen === screen &&
          !(next.showAppSwitcher && !previous.showAppSwitcher))
      )
        return;
      const source = viewport.current;
      if (!source || !source.offsetWidth || !source.offsetHeight) return;

      // Freeze the outgoing DOM synchronously before React replaces it. This does
      // not mount another mini app or run its effects, timers, or media again.
      const snapshot = source.cloneNode(true);
      if (!(snapshot instanceof HTMLElement)) return;
      const sourceNodes = [
        source,
        ...source.querySelectorAll<HTMLElement>("*"),
      ];
      const snapshotNodes = [
        snapshot,
        ...snapshot.querySelectorAll<HTMLElement>("*"),
      ];
      const theme = source.closest(".phone-theme");
      const host = document.createElement("div");
      host.className = "phone-theme";
      host.dataset.phoneTheme =
        theme?.getAttribute("data-phone-theme") ?? "dark";
      host.inert = true;
      host.setAttribute("aria-hidden", "true");
      const style = getComputedStyle(source);
      host.style.cssText = `position:fixed;left:-10000px;top:0;width:${source.offsetWidth}px;height:${source.offsetHeight}px;pointer-events:none;`;
      host.style.font = style.font;
      for (const name of [
        "--phone-safe-area-top",
        "--phone-safe-area-bottom",
      ]) {
        host.style.setProperty(name, style.getPropertyValue(name));
      }
      snapshot.style.position = "relative";
      snapshot.style.inset = "auto";
      snapshot.style.width = "100%";
      snapshot.style.height = "100%";
      // Never copy password inputs or embed a second browsing context.
      snapshot
        .querySelectorAll("iframe,video,audio,[data-private-preview]")
        .forEach((element) => element.remove());
      snapshot
        .querySelectorAll<HTMLInputElement>('input[type="password"]')
        .forEach((input) => {
          input.value = "";
          input.removeAttribute("value");
        });
      host.appendChild(snapshot);
      document.body.appendChild(host);
      activeHost = host;
      // Restore scrolling by matching only the scroll containers that survived filtering.
      sourceNodes
        .filter((node) => node.scrollTop > 0)
        .forEach((node) => {
          const index = sourceNodes.indexOf(node);
          const copy = snapshotNodes[index];
          if (copy?.isConnected) copy.scrollTop = node.scrollTop;
        });
      capturing = true;
      void import("html-to-image")
        .then(({ toBlob }) =>
          toBlob(snapshot, {
            pixelRatio: 0.75,
            backgroundColor: style.getPropertyValue("--phone-canvas").trim(),
            skipFonts: true,
          }),
        )
        .then((blob) => {
          if (
            blob &&
            !disposed &&
            usePhoneStore.getState().history.includes(screen)
          ) {
            useAppPreviewStore.getState().save(screen, blob);
          }
        })
        .catch(() => {
          // Cross-origin media or unsupported canvas capture uses the labelled fallback.
        })
        .finally(() => {
          host.remove();
          capturing = false;
        });
    });
    return () => {
      disposed = true;
      unsubscribe();
      activeHost?.remove();
    };
  }, [viewport]);
}

"use client";

import { useCallback, type ReactNode, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LuX } from "react-icons/lu";
import { scrollSheet } from "@/lib/sheet-scroll";
import styles from "./music.module.css";

export default function QueueSheet({
  open,
  onOpenChange,
  trackCount,
  returnFocus,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackCount: number;
  returnFocus: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
}) {
  const attachScroll = useCallback((body: HTMLDivElement | null) => {
    if (!body) return;
    // CSS 3D phone displays need explicit bounded wheel movement in modals.
    const onWheel = (event: WheelEvent) => {
      if (scrollSheet(body, event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    body.addEventListener("wheel", onWheel, { passive: false });
    return () => body.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Overlay className={styles.queueOverlay} data-no-turntable />
      <Dialog.Content
        id="music-queue-sheet"
        className={styles.queueSheet}
        data-no-turntable
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <span className={styles.sheetHandle} aria-hidden="true" />
        <header className={styles.queueHeader}>
          <div>
            <Dialog.Title>Queue</Dialog.Title>
          </div>
          <Dialog.Close className={styles.iconButton} aria-label="Close queue">
            <LuX />
          </Dialog.Close>
        </header>
        <div ref={attachScroll} className={styles.queueBody}>
          {children}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

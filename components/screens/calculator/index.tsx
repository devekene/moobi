"use client";

import { useEffect, useRef, useState } from "react";
import CalculatorBoard from "./CalculatorBoard";
import CalculatorHistory from "./CalculatorHistory";
import { useCalculatorStore } from "@/stores/useCalculatorStore";
import styles from "./calculator.module.css";

export default function Calculator() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const screen = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!historyOpen && wasOpen.current) {
      screen.current
        ?.querySelector<HTMLButtonElement>(
          '[aria-label="Open calculation history"]',
        )
        ?.focus();
    }
    wasOpen.current = historyOpen;
  }, [historyOpen]);
  function closeHistory() {
    setHistoryOpen(false);
  }
  return (
    <main
      tabIndex={0}
      ref={screen}
      className={styles.screen}
      aria-label="Calculator"
      onKeyDown={(event) => {
        if (historyOpen || event.altKey || event.ctrlKey || event.metaKey)
          return;
        const keys: Record<string, string> = {
          Enter: "=",
          "=": "=",
          Escape: "AC",
          Backspace: "backspace",
          Delete: "AC",
          "*": "×",
          "/": "÷",
          "-": "−",
        };
        // Native button Enter/Space keeps its expected action.
        if (event.key === "Enter" && event.target instanceof HTMLButtonElement)
          return;
        const key =
          keys[event.key] ??
          (/^[\d.+%()^]$/.test(event.key) ? event.key : null);
        if (key) {
          event.preventDefault();
          useCalculatorStore.getState().press(key);
        }
      }}
    >
      <div className={styles.boardContainer} inert={historyOpen}>
        <CalculatorBoard onHistory={() => setHistoryOpen(true)} />
      </div>
      {historyOpen && <CalculatorHistory onClose={closeHistory} />}
    </main>
  );
}

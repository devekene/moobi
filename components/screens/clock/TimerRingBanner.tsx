"use client";

import { LuRotateCw, LuX } from "react-icons/lu";
import { useClock } from "@/context/ClockContext";
import styles from "./TimerRingBanner.module.css";

const TimerRingBanner = () => {
  const { timer, dispatchTimer } = useClock();
  const ringing = timer.items.find((item) => item.status === "ringing");
  if (!ringing) return null;
  return (
    <section className={styles.banner} aria-label="Ringing timer">
      <span className={styles.announcement} role="alert">
        {ringing.label || "Timer"} finished.
      </span>
      <button
        type="button"
        className={`${styles.action} ${styles.restart}`}
        aria-label="Restart ringing timer"
        onClick={() =>
          dispatchTimer({ type: "restart", id: ringing.id, now: Date.now() })
        }
      >
        <LuRotateCw aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.action}
        aria-label="Stop ringing timer"
        onClick={() => dispatchTimer({ type: "cancel", id: ringing.id })}
      >
        <LuX aria-hidden="true" />
      </button>
      <span className={styles.label}>{ringing.label || "Timer"}</span>
    </section>
  );
};
export default TimerRingBanner;

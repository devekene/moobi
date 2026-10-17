"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useClock } from "@/context/ClockContext";
import {
  formatStopwatch,
  getStopwatchElapsed,
  getStopwatchLapExtremes,
} from "@/lib/stopwatch";
import styles from "./Stopwatch.module.css";

const ticks = Array.from({ length: 300 }, (_, index) => (
  <line
    key={index}
    x1="150"
    x2="150"
    y1={index % 25 === 0 ? 4 : index % 5 === 0 ? 5 : 6}
    y2={index % 25 === 0 ? 17 : index % 5 === 0 ? 12 : 9}
    transform={`rotate(${index * 1.2} 150 150)`}
    className={index % 25 === 0 ? styles.majorTick : styles.minorTick}
  />
));
const numbers = Array.from({ length: 12 }, (_, index) => {
  const angle = (index * Math.PI) / 6;
  return (
    <text
      key={index}
      x={150 + Math.sin(angle) * 119}
      y={150 - Math.cos(angle) * 119}
      className={styles.dialNumber}
    >
      {index === 0 ? 60 : index * 5}
    </text>
  );
});
const minuteTicks = Array.from({ length: 60 }, (_, index) => (
  <line
    key={index}
    x1="150"
    x2="150"
    y1="53"
    y2={index % 10 === 0 ? 60 : 57}
    transform={`rotate(${index * 6} 150 94)`}
    className={styles.minorTick}
  />
));
const minuteNumbers = Array.from({ length: 6 }, (_, index) => {
  const angle = (index * Math.PI) / 3;
  return (
    <text
      key={index}
      x={150 + Math.sin(angle) * 27}
      y={94 - Math.cos(angle) * 27}
      className={styles.minuteNumber}
    >
      {index === 0 ? 30 : index * 5}
    </text>
  );
});

const Stopwatch = () => {
  const { stopwatch, dispatchStopwatch } = useClock();
  const [now, setNow] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const running = stopwatch.startedAt !== null;
  const elapsed = getStopwatchElapsed(stopwatch, now);
  const lapElapsed = elapsed - (stopwatch.laps[0]?.totalMs ?? 0);
  const hasSession = running || elapsed > 0 || stopwatch.laps.length > 0;
  const analog = stopwatch.view === "analog";

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(preference.matches);
    const initial = window.setTimeout(sync, 0);
    preference.addEventListener("change", sync);
    return () => {
      window.clearTimeout(initial);
      preference.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    let frame: number | undefined;
    let previous = 0;
    const update = (timestamp: number) => {
      if (timestamp - previous >= (reducedMotion ? 100 : 16)) {
        setNow(Date.now());
        previous = timestamp;
      }
      frame = window.requestAnimationFrame(update);
    };
    const syncVisibility = () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      if (document.visibilityState === "visible")
        frame = window.requestAnimationFrame(update);
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [running, reducedMotion]);

  const completedLaps = useMemo(() => {
    const extremes = getStopwatchLapExtremes(stopwatch.laps);
    return stopwatch.laps.map((lap) => (
      <li
        key={lap.id}
        className={`${styles.lap} ${lap.id === extremes?.fastest ? styles.fastest : lap.id === extremes?.slowest ? styles.slowest : ""}`}
        aria-label={`Lap ${lap.id}, ${formatStopwatch(lap.durationMs)}${lap.id === extremes?.fastest ? ", fastest" : lap.id === extremes?.slowest ? ", slowest" : ""}`}
      >
        <span>Lap {lap.id}</span>
        <span className={styles.lapTime}>
          {formatStopwatch(lap.durationMs)}
        </span>
      </li>
    ));
  }, [stopwatch.laps]);

  const handTime = reducedMotion ? Math.floor(elapsed / 1000) * 1000 : elapsed;
  const lapHandTime = reducedMotion
    ? Math.floor(lapElapsed / 1000) * 1000
    : lapElapsed;

  return (
    <div className={styles.screen}>
      <h1 className="sr-only">Stopwatch</h1>
      <div
        className={styles.hero}
        role="timer"
        aria-label={`Stopwatch elapsed ${formatStopwatch(elapsed)}`}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse" || event.button === 0) {
            gesture.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          gesture.current = null;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x,
            dy = event.clientY - start.y;
          if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5)
            dispatchStopwatch({
              type: "view",
              view: dx < 0 ? "analog" : "digital",
            });
        }}
      >
        {analog ? (
          <svg viewBox="0 0 300 300" className={styles.dial} aria-hidden="true">
            {ticks}
            {numbers}
            {minuteTicks}
            {minuteNumbers}
            <line
              x1="150"
              y1="99"
              x2="150"
              y2="54"
              className={styles.orangeHand}
              transform={`rotate(${(handTime / 1800000) * 360} 150 94)`}
            />
            <circle cx="150" cy="94" r="2.5" className={styles.orangeCap} />
            <line
              x1="150"
              y1="176"
              x2="150"
              y2="6"
              className={styles.lapHand}
              transform={`rotate(${(lapHandTime / 60000) * 360} 150 150)`}
            />
            <line
              x1="150"
              y1="176"
              x2="150"
              y2="6"
              className={styles.orangeHand}
              transform={`rotate(${(handTime / 60000) * 360} 150 150)`}
            />
            <circle cx="150" cy="150" r="3" className={styles.centerCap} />
            <text x="150" y="211" className={styles.dialTime}>
              {formatStopwatch(elapsed)}
            </text>
          </svg>
        ) : (
          <span
            className={`${styles.digitalTime} ${elapsed >= 6000000 ? styles.longDigital : ""}`}
            aria-hidden="true"
          >
            {formatStopwatch(elapsed)}
          </span>
        )}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.secondary}
          disabled={!running && !hasSession}
          aria-label={running || !hasSession ? "Record lap" : "Reset stopwatch"}
          onClick={() =>
            dispatchStopwatch(
              running ? { type: "lap", now: Date.now() } : { type: "reset" },
            )
          }
        >
          {running || !hasSession ? "Lap" : "Reset"}
        </button>
        <div
          className={styles.pages}
          role="group"
          aria-label="Stopwatch display"
        >
          <button
            type="button"
            aria-label="Digital stopwatch"
            aria-pressed={!analog}
            onClick={() => dispatchStopwatch({ type: "view", view: "digital" })}
          >
            <span aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Analog stopwatch"
            aria-pressed={analog}
            onClick={() => dispatchStopwatch({ type: "view", view: "analog" })}
          >
            <span aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className={`${styles.primary} ${running ? styles.stop : styles.start}`}
          aria-label={running ? "Stop stopwatch" : "Start stopwatch"}
          onClick={() =>
            dispatchStopwatch({
              type: running ? "stop" : "start",
              now: Date.now(),
            })
          }
        >
          {running ? "Stop" : "Start"}
        </button>
      </div>

      <section className={styles.laps} aria-label="Stopwatch laps">
        {hasSession && (
          <ol>
            <li
              className={styles.lap}
              aria-label={`Current lap ${stopwatch.laps.length + 1}, ${formatStopwatch(lapElapsed)}`}
            >
              <span>Lap {stopwatch.laps.length + 1}</span>
              <span className={styles.lapTime}>
                {formatStopwatch(lapElapsed)}
              </span>
            </li>
            {completedLaps}
          </ol>
        )}
      </section>
    </div>
  );
};
export default Stopwatch;

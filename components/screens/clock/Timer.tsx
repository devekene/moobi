"use client";

import { useEffect, useRef, useState } from "react";
import {
  LuChevronRight,
  LuChevronLeft,
  LuBell,
  LuPlus,
  LuRotateCw,
  LuCircleMinus,
  LuPause,
  LuPlay,
  LuX,
} from "react-icons/lu";
import Picker from "react-mobile-picker";
import { useClock } from "@/context/ClockContext";
import {
  describeTimer,
  formatTimer,
  getTimerSeconds,
  type ActiveTimer,
} from "@/lib/timers";
import styles from "./Timer.module.css";

const columns = [
  { name: "hours", label: "Hours", unit: "hours", count: 24 },
  { name: "minutes", label: "Minutes", unit: "min", count: 60 },
  { name: "seconds", label: "Seconds", unit: "sec", count: 60 },
] as const;

const Timer = () => {
  const { timer, dispatchTimer } = useClock();
  const [editing, setEditing] = useState(false);
  const [soundMessage, setSoundMessage] = useState("");
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const backRef = useRef<HTMLButtonElement | null>(null);
  const selected = timer.items.find((item) => item.id === timer.selectedId);
  const detail = timer.view === "detail" && selected !== undefined;
  const setup = timer.view === "setup";
  useEffect(() => {
    if (detail) backRef.current?.focus();
  }, [detail]);
  const actionFor = (item: ActiveTimer) =>
    item.status === "running"
      ? "pause"
      : item.status === "paused"
        ? "resume"
        : "restart";
  const controlLabel = (item: ActiveTimer) =>
    item.status === "running"
      ? "Pause timer"
      : item.status === "paused"
        ? "Resume timer"
        : "Restart timer";
  const progressRing = (item: ActiveTimer) => (
    <svg viewBox="0 0 180 180" aria-hidden="true" className={styles.progress}>
      <circle cx="90" cy="90" r="84" className={styles.track} />
      <circle
        cx="90"
        cy="90"
        r="84"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset={1 - item.remaining / item.duration}
        className={styles.remaining}
      />
    </svg>
  );
  const value = {
    hours: timer.draft.hours,
    minutes: timer.draft.minutes,
    seconds: timer.draft.seconds,
  };

  const previewSound = async () => {
    const audio = previewRef.current ?? new Audio("/sounds/alarm.wav");
    previewRef.current = audio;
    if (!audio.paused) {
      audio.pause();
      setSoundMessage("");
      return;
    }
    audio.currentTime = 0;
    audio.onended = () => setSoundMessage("");
    try {
      await audio.play();
      setSoundMessage("Playing the built-in alarm sound. Tap Sound to stop.");
    } catch {
      setSoundMessage("Sound preview is unavailable in this browser.");
    }
  };

  useEffect(
    () => () => {
      if (previewRef.current) {
        previewRef.current.onended = null;
        previewRef.current.pause();
      }
    },
    [],
  );

  return (
    <div className={`${styles.screen} ${detail ? styles.detailScreen : ""}`}>
      {detail ? (
        <button
          ref={backRef}
          type="button"
          className={styles.back}
          aria-label="Back to timers"
          onClick={() => dispatchTimer({ type: "navigate", view: "list" })}
        >
          <LuChevronLeft aria-hidden="true" />
        </button>
      ) : (
        <header className={styles.header}>
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.edit}
              disabled={!timer.recents.length && !editing}
              aria-label={
                editing ? "Done editing recent timers" : "Edit recent timers"
              }
              aria-pressed={editing}
              onClick={() => setEditing((previous) => !previous)}
            >
              {editing ? "Done" : "Edit"}
            </button>
            {timer.items.length > 0 && (
              <button
                type="button"
                className={styles.back}
                aria-label={setup ? "Back to active timers" : "Add timer"}
                onClick={() =>
                  dispatchTimer({
                    type: "navigate",
                    view: setup ? "list" : "setup",
                  })
                }
              >
                {setup ? (
                  <LuChevronLeft aria-hidden="true" />
                ) : (
                  <LuPlus aria-hidden="true" />
                )}
              </button>
            )}
          </div>
          <h1>Timers</h1>
        </header>
      )}

      {detail && (
        <div className={`${styles.countdown} ${styles.detailCountdown}`}>
          {progressRing(selected)}
          <div className={styles.readout}>
            <span className={styles.finishTime}>
              {selected.status === "running" && selected.deadline !== null ? (
                <>
                  <LuBell aria-hidden="true" />{" "}
                  {new Date(selected.deadline).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              ) : selected.status === "paused" ? (
                "Paused"
              ) : (
                "Timer finished"
              )}
            </span>
            <span
              className={`${styles.remainingTime} ${selected.duration >= 3600 ? styles.longTime : ""}`}
              role="timer"
              aria-label={`${describeTimer(selected.remaining)} remaining`}
            >
              {formatTimer(selected.remaining, true)}
            </span>
            <span className={styles.timerLabel}>
              {describeTimer(selected.duration)}
            </span>
          </div>
        </div>
      )}

      {!setup && !detail && (
        <section className={styles.activeTimers} aria-label="Active timers">
          {timer.items.map((item) => (
            <div className={styles.activeRow} key={item.id}>
              <button
                type="button"
                className={styles.openTimer}
                aria-label={`Open ${item.label || describeTimer(item.duration)} timer`}
                onClick={() =>
                  dispatchTimer({
                    type: "navigate",
                    view: "detail",
                    id: item.id,
                  })
                }
              >
                <span
                  className={styles.activeTime}
                  role="timer"
                  aria-label={`${describeTimer(item.remaining)} remaining`}
                >
                  {formatTimer(item.remaining, true)}
                </span>
                <span className={styles.activeLabel}>
                  {item.label ? `${item.label} · ` : ""}
                  {item.status === "ringing"
                    ? "Timer finished"
                    : describeTimer(item.duration)}
                </span>
              </button>
              <button
                type="button"
                className={`${styles.rowControl} ${item.status !== "paused" ? styles.pause : styles.start}`}
                aria-label={`${controlLabel(item)}, ${item.label || describeTimer(item.duration)}`}
                onClick={() =>
                  dispatchTimer({
                    type: actionFor(item),
                    id: item.id,
                    now: Date.now(),
                  })
                }
              >
                {progressRing(item)}
                {item.status === "running" ? (
                  <LuPause aria-hidden="true" />
                ) : item.status === "paused" ? (
                  <LuPlay aria-hidden="true" />
                ) : (
                  <LuRotateCw aria-hidden="true" />
                )}
              </button>
            </div>
          ))}
        </section>
      )}

      {setup && (
        <div className={styles.wheel}>
          <div className={styles.selection} aria-hidden="true" />
          <Picker
            value={value}
            onChange={(draft) => dispatchTimer({ type: "configure", draft })}
            height={130}
            itemHeight={26}
            wheelMode="natural"
            className={styles.picker}
          >
            {columns.map(({ name, label, unit, count }) => (
              <Picker.Column
                key={name}
                name={name}
                role="spinbutton"
                tabIndex={0}
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={count - 1}
                aria-valuenow={value[name]}
                onKeyDown={(event) => {
                  if (
                    !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
                  )
                    return;
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? count - 1
                        : (value[name] +
                            (event.key === "ArrowUp" ? -1 : 1) +
                            count) %
                          count;
                  dispatchTimer({ type: "configure", draft: { [name]: next } });
                }}
              >
                {Array.from({ length: count }, (_, number) => (
                  <Picker.Item key={number} value={number} aria-hidden="true">
                    {({ selected }) => (
                      <span
                        className={
                          selected ? styles.selectedTime : styles.wheelTime
                        }
                      >
                        {number}
                        {selected && (
                          <span className={styles.unit}> {unit}</span>
                        )}
                      </span>
                    )}
                  </Picker.Item>
                ))}
              </Picker.Column>
            ))}
          </Picker>
        </div>
      )}

      {(setup || detail) && (
        <div className={styles.controls}>
          <button
            type="button"
            aria-label="Cancel timer"
            className={styles.control}
            disabled={!detail}
            onClick={() => {
              if (selected) dispatchTimer({ type: "cancel", id: selected.id });
            }}
          >
            <LuX aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={detail ? controlLabel(selected) : "Start timer"}
            className={`${styles.control} ${detail && selected.status !== "paused" ? styles.pause : styles.start}`}
            disabled={setup && getTimerSeconds(timer.draft) === 0}
            onClick={() =>
              dispatchTimer(
                detail
                  ? {
                      type: actionFor(selected),
                      id: selected.id,
                      now: Date.now(),
                    }
                  : { type: "start", now: Date.now() },
              )
            }
          >
            {detail && selected.status === "running" ? (
              <LuPause aria-hidden="true" />
            ) : detail && selected.status === "ringing" ? (
              <LuRotateCw aria-hidden="true" />
            ) : (
              <LuPlay aria-hidden="true" />
            )}
          </button>
        </div>
      )}

      {(setup || detail) && (
        <>
          <section className={styles.settings} aria-label="Timer settings">
            <label className={styles.setting}>
              <span>Label</span>
              <input
                aria-label="Timer label"
                placeholder="Timer"
                maxLength={80}
                value={detail ? selected.label : timer.draft.label}
                disabled={detail}
                onChange={(event) =>
                  dispatchTimer({
                    type: "configure",
                    draft: { label: event.target.value },
                  })
                }
              />
            </label>
            <button
              type="button"
              className={styles.setting}
              aria-label="Preview timer sound"
              onClick={previewSound}
            >
              <span>Sound</span>
              <span className={styles.settingValue}>
                Alarm <LuChevronRight aria-hidden="true" />
              </span>
            </button>
          </section>
          <p className={styles.soundMessage} role="status">
            {soundMessage}
          </p>
        </>
      )}

      {!detail && (
        <section
          className={styles.recents}
          aria-labelledby="recent-timers-title"
        >
          <h2 id="recent-timers-title">Recents</h2>
          {timer.recents.length === 0 ? (
            <p className={styles.empty}>
              Your recently started timers will appear here.
            </p>
          ) : (
            timer.recents.map((recent) => (
              <div className={styles.recent} key={recent.id}>
                {editing && (
                  <button
                    type="button"
                    className={styles.delete}
                    aria-label={`Delete recent ${describeTimer(recent.seconds)} timer${recent.label ? `, ${recent.label}` : ""}`}
                    onClick={() =>
                      dispatchTimer({ type: "delete-recent", id: recent.id })
                    }
                  >
                    <LuCircleMinus aria-hidden="true" />
                  </button>
                )}
                <div className={styles.recentDetails}>
                  <span className={styles.recentTime}>
                    {formatTimer(recent.seconds)}
                  </span>
                  <span className={styles.recentLabel}>
                    {recent.label ? `${recent.label} · ` : ""}
                    {describeTimer(recent.seconds)}
                  </span>
                </div>
                <button
                  type="button"
                  className={`${styles.recentPlay} ${styles.start}`}
                  aria-label={`Start recent ${describeTimer(recent.seconds)} timer${recent.label ? `, ${recent.label}` : ""}`}
                  onClick={() =>
                    dispatchTimer({ type: "start", recent, now: Date.now() })
                  }
                >
                  <LuPlay aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
};
export default Timer;

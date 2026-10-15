"use client";

import { LuX } from "react-icons/lu";
import { IoAlarm } from "react-icons/io5";
import { useClock } from "@/context/ClockContext";
import styles from "./AlarmRingOverlay.module.css";

const AlarmRingOverlay = () => {
  const {
    setAlarms,
    setRingingAlarmId,
    alarmAudioRef,
    ringingAlarmId,
    alarms,
  } = useClock();
  const ringingAlarm = alarms.find((alarm) => alarm.id === ringingAlarmId);
  if (!ringingAlarm) return null;

  const label = ringingAlarm.label?.trim() || "Alarm";
  const snoozeMinutes = ringingAlarm.snoozeDuration ?? 9;

  const stopAlarm = () => {
    alarmAudioRef.current?.pause();
    setRingingAlarmId(null);
  };

  const snoozeAlarm = () => {
    setAlarms((prev) =>
      prev.map((alarm) =>
        alarm.id === ringingAlarmId
          ? { ...alarm, snoozeUntil: Date.now() + snoozeMinutes * 60_000 }
          : alarm,
      ),
    );
    stopAlarm();
  };

  return (
    <section className={styles.banner} aria-label="Ringing alarm">
      <span className={styles.announcement} role="alert">
        {ringingAlarm.time}, {label}. Alarm ringing.
      </span>
      <IoAlarm className={styles.alarmIcon} aria-hidden="true" />
      <div className={styles.details}>
        <span className={styles.time}>{ringingAlarm.time}</span>
        <h2 className={styles.label}>{label}</h2>
      </div>
      <div className={styles.actions}>
        {ringingAlarm.snoozeEnabled !== false && (
          <button
            type="button"
            className={`${styles.action} ${styles.snooze}`}
            aria-label={`Snooze alarm for ${snoozeMinutes} minutes`}
            onClick={snoozeAlarm}
          >
            <span className={styles.sleepIcon} aria-hidden="true">
              <span>Z</span>
              <span>z</span>
            </span>
          </button>
        )}
        <button
          type="button"
          className={styles.action}
          aria-label="Stop alarm"
          onClick={stopAlarm}
        >
          <LuX aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};
export default AlarmRingOverlay;

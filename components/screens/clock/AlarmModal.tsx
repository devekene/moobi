"use client";

import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LuCheck, LuChevronRight, LuX } from "react-icons/lu";
import Picker from "react-mobile-picker";
import { useClock } from "@/context/ClockContext";
import {
  getAlarmRepeatDays,
  getAlarmRepeatLabel,
  getRepeatMode,
} from "@/lib/alarms";
import { type Alarm } from "@/types";
import styles from "./AlarmModal.module.css";

const weekdays = [
  { day: 1, label: "Monday", initial: "M" },
  { day: 2, label: "Tuesday", initial: "T" },
  { day: 3, label: "Wednesday", initial: "W" },
  { day: 4, label: "Thursday", initial: "T" },
  { day: 5, label: "Friday", initial: "F" },
  { day: 6, label: "Saturday", initial: "S" },
  { day: 0, label: "Sunday", initial: "S" },
];
const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);

const AlarmModal = ({
  setIsAdding,
  alarmToEdit: data,
  setAlarmToEdit,
  isWakeUpAlarm = false,
  container,
}: {
  setIsAdding: Dispatch<SetStateAction<boolean>>;
  alarmToEdit?: Alarm;
  setAlarmToEdit: Dispatch<SetStateAction<Alarm | null>>;
  isWakeUpAlarm?: boolean;
  container?: HTMLDivElement | null;
}) => {
  const { setAlarms } = useClock();
  const soundPreview = useRef<HTMLAudioElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [title, setTitle] = useState(
    data?.label ?? (isWakeUpAlarm ? "Wake Up" : ""),
  );
  const [repeatDays, setRepeatDays] = useState(() =>
    getAlarmRepeatDays(
      data ?? { repeatMode: isWakeUpAlarm ? "daily" : "once" },
    ),
  );
  const [snoozeEnabled, setSnoozeEnabled] = useState(
    data?.snoozeEnabled ?? true,
  );
  const [snoozeDuration, setSnoozeDuration] = useState(
    data?.snoozeDuration ?? 9,
  );
  const [soundMessage, setSoundMessage] = useState("");
  const [time, setTime] = useState(() => {
    const now = new Date();
    return data
      ? { hour: data.time.split(":")[0], minute: data.time.split(":")[1] }
      : isWakeUpAlarm
        ? { hour: "07", minute: "00" }
        : {
            hour: String(now.getHours()).padStart(2, "0"),
            minute: String(now.getMinutes()).padStart(2, "0"),
          };
  });

  const closeModal = () => {
    if (soundPreview.current) {
      soundPreview.current.pause();
      soundPreview.current.currentTime = 0;
    }
    setAlarmToEdit(null);
    setIsAdding(false);
  };

  const saveAlarm = () => {
    const settings = {
      time: `${time.hour}:${time.minute}`,
      label: title.trim(),
      repeatMode: getRepeatMode(repeatDays),
      repeatDays,
      snoozeEnabled,
      snoozeDuration,
    };
    setAlarms((prev) =>
      data
        ? prev.map((alarm) =>
            alarm.id === data.id ? { ...alarm, ...settings } : alarm,
          )
        : [
            ...prev,
            {
              ...settings,
              id: Math.max(0, ...prev.map((alarm) => alarm.id)) + 1,
              enabled: true,
              isWakeUp: isWakeUpAlarm,
            },
          ],
    );
    closeModal();
  };

  const previewSound = async () => {
    const audio = soundPreview.current ?? new Audio("/sounds/alarm.wav");
    soundPreview.current = audio;
    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
      setSoundMessage("");
      return;
    }
    audio.loop = false;
    audio.currentTime = 0;
    try {
      await audio.play();
      setSoundMessage("Playing the built-in alarm sound. Tap Sound to stop.");
    } catch {
      setSoundMessage("Sound preview is unavailable in this browser.");
    }
  };

  useEffect(
    () => () => {
      soundPreview.current?.pause();
    },
    [],
  );

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <Dialog.Portal container={container}>
        <Dialog.Content
          className={styles.sheet}
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            if (document.activeElement instanceof HTMLElement)
              returnFocus.current = document.activeElement;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <header className={styles.header}>
            <button
              type="button"
              className={styles.circle}
              aria-label="Cancel alarm editing"
              onClick={closeModal}
            >
              <LuX aria-hidden="true" />
            </button>
            <Dialog.Title className={styles.title}>
              {data
                ? "Edit Alarm"
                : isWakeUpAlarm
                  ? "Set Wake Up"
                  : "Add Alarm"}
            </Dialog.Title>
            <button
              type="button"
              className={`${styles.circle} ${styles.save}`}
              aria-label="Save alarm"
              onClick={saveAlarm}
            >
              <LuCheck aria-hidden="true" />
            </button>
          </header>

          <div className={styles.body}>
            <div className={styles.wheel}>
              <div className={styles.selection} aria-hidden="true" />
              <Picker
                value={time}
                onChange={setTime}
                height={156}
                itemHeight={26}
                wheelMode="natural"
                className={styles.picker}
              >
                {(["hour", "minute"] as const).map((part) => (
                  <Picker.Column
                    key={part}
                    name={part}
                    role="spinbutton"
                    tabIndex={0}
                    aria-label={part === "hour" ? "Hours" : "Minutes"}
                    aria-valuemin={0}
                    aria-valuemax={part === "hour" ? 23 : 59}
                    aria-valuenow={Number(time[part])}
                    onKeyDown={(event) => {
                      const values = part === "hour" ? hours : minutes;
                      if (
                        !["ArrowUp", "ArrowDown", "Home", "End"].includes(
                          event.key,
                        )
                      )
                        return;
                      event.preventDefault();
                      const next =
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? values.length - 1
                            : (Number(time[part]) +
                                (event.key === "ArrowUp" ? -1 : 1) +
                                values.length) %
                              values.length;
                      setTime((prev) => ({ ...prev, [part]: values[next] }));
                    }}
                  >
                    {(part === "hour" ? hours : minutes).map((value) => (
                      <Picker.Item key={value} value={value} aria-hidden="true">
                        {({ selected }) => (
                          <span
                            className={
                              selected ? styles.selectedTime : styles.time
                            }
                          >
                            {value}
                          </span>
                        )}
                      </Picker.Item>
                    ))}
                  </Picker.Column>
                ))}
              </Picker>
            </div>

            <section className={styles.group} aria-label="Repeat days">
              <div className={styles.row}>
                <span>Repeat</span>
                <span className={styles.value}>
                  {getAlarmRepeatLabel({
                    repeatMode: getRepeatMode(repeatDays),
                    repeatDays,
                  })}
                </span>
              </div>
              <div className={styles.days}>
                {weekdays.map(({ day, label, initial }) => (
                  <button
                    key={day}
                    type="button"
                    className={styles.day}
                    aria-label={label}
                    aria-pressed={repeatDays.includes(day)}
                    onClick={() =>
                      setRepeatDays((prev) =>
                        prev.includes(day)
                          ? prev.filter((value) => value !== day)
                          : [...prev, day],
                      )
                    }
                  >
                    {initial}
                  </button>
                ))}
              </div>
            </section>

            <section
              className={`${styles.group} ${styles.settings}`}
              aria-label="Alarm settings"
            >
              <label className={styles.row}>
                <span>Label</span>
                <input
                  aria-label="Alarm label"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Alarm"
                  maxLength={80}
                />
              </label>
              <button
                type="button"
                className={styles.row}
                onClick={previewSound}
                aria-label="Preview alarm sound"
              >
                <span>Sound</span>
                <span className={styles.value}>
                  Alarm <LuChevronRight aria-hidden="true" />
                </span>
              </button>
              <div className={styles.row}>
                <span id="alarm-snooze-label">Snooze</span>
                <button
                  type="button"
                  role="switch"
                  aria-labelledby="alarm-snooze-label"
                  aria-checked={snoozeEnabled}
                  className={styles.switch}
                  onClick={() => setSnoozeEnabled((value) => !value)}
                >
                  <span aria-hidden="true" />
                </button>
              </div>
              {snoozeEnabled && (
                <label className={styles.row}>
                  <span>Snooze Duration</span>
                  <select
                    aria-label="Snooze duration"
                    value={snoozeDuration}
                    onChange={(event) =>
                      setSnoozeDuration(Number(event.target.value))
                    }
                  >
                    {[1, 5, 9, 10, 15, 30].map((duration) => (
                      <option key={duration} value={duration}>
                        {duration} min
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>
            <p className={styles.soundMessage} role="status">
              {soundMessage}
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
export default AlarmModal;

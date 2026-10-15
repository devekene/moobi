"use client";

import { useState } from "react";
import { LuBedDouble, LuCircleMinus, LuPlus } from "react-icons/lu";
import { useClock } from "@/context/ClockContext";
import AlarmModal from "@/components/screens/clock/AlarmModal";
import {
  getAlarmDescription,
  getAlarmGroups,
  getAlarmTimeParts,
} from "@/lib/alarms";
import { cn } from "@/lib/utils";
import type { Alarm } from "@/types";

const ClockAlarm = ({
  editorContainer,
}: {
  editorContainer?: HTMLDivElement | null;
}) => {
  const { alarms, setAlarms } = useClock();
  const [alarmToEdit, setAlarmToEdit] = useState<Alarm | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingWakeUp, setIsAddingWakeUp] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { wakeUp, regular } = getAlarmGroups(alarms);
  const wakeUpTime = wakeUp ? getAlarmTimeParts(wakeUp.time) : null;

  const toggleAlarm = (id: number) => {
    setAlarms((prev) =>
      prev.map((alarm) =>
        alarm.id === id ? { ...alarm, enabled: !alarm.enabled } : alarm,
      ),
    );
  };

  const deleteAlarm = (id: number) => {
    setAlarms((prev) => prev.filter((alarm) => alarm.id !== id));
  };

  return (
    <div className="relative h-full w-full text-[var(--phone-text)]">
      <div
        className="h-full [scrollbar-width:none] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
        style={{ paddingInline: 16, paddingBottom: 16 }}
      >
        <header className="flex flex-col gap-4">
          <div className="flex min-h-11 items-center justify-between">
            {regular.length > 0 ? (
              <button
                type="button"
                onClick={() => setIsEditing((value) => !value)}
                aria-pressed={isEditing}
                className="min-h-11 text-sm font-medium text-[var(--phone-accent)] focus-visible:rounded-lg"
              >
                {isEditing ? "Done" : "Edit"}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              aria-label="Add alarm"
              onClick={() => {
                setIsAddingWakeUp(false);
                setIsAdding(true);
              }}
              className="flex size-11 items-center justify-center rounded-full border border-[var(--phone-border)] bg-[var(--phone-surface-elevated)]/85 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--phone-text)_12%,transparent)] backdrop-blur-md transition-transform active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
            >
              <LuPlus className="size-6" aria-hidden="true" />
            </button>
          </div>
          <h1 className="text-[34px] leading-tight font-bold tracking-[-0.04em]">
            Alarms
          </h1>
        </header>

        <section aria-labelledby="wake-up-heading" style={{ marginTop: 32 }}>
          <h2
            id="wake-up-heading"
            className="flex items-center gap-1.5 text-[18px] leading-tight font-semibold tracking-[-0.02em]"
            style={{ marginBottom: 12 }}
          >
            <LuBedDouble className="size-5 shrink-0" aria-hidden="true" />
            Sleep | Wake Up
          </h2>
          <div className="flex min-h-[56px] items-center justify-between gap-3 border-y border-[var(--phone-border)]">
            <span className="min-w-0 text-[15px] text-[var(--phone-text-muted)]">
              {wakeUpTime
                ? `${wakeUpTime.time} ${wakeUpTime.period}${wakeUp?.enabled ? "" : " · Off"}`
                : "No Alarm"}
            </span>
            <button
              type="button"
              aria-label={
                wakeUp ? "Change wake-up alarm" : "Set up wake-up alarm"
              }
              onClick={() => {
                setIsAddingWakeUp(true);
                if (wakeUp) setAlarmToEdit(wakeUp);
                else setIsAdding(true);
              }}
              className="flex min-h-9 shrink-0 items-center justify-center rounded-full bg-[var(--phone-surface-elevated)] text-[11px] font-bold text-[var(--phone-accent)] uppercase transition-opacity active:opacity-70 motion-reduce:transition-none"
              style={{ paddingInline: 12 }}
            >
              {wakeUp ? "Change" : "Set Up"}
            </button>
          </div>
        </section>

        {regular.length > 0 && (
          <section aria-label="Other alarms" style={{ marginTop: 28 }}>
            {regular.map((alarm) => {
              const display = getAlarmTimeParts(alarm.time);
              const description = getAlarmDescription(alarm);
              return (
                <div
                  key={alarm.id}
                  className="flex items-center gap-2 border-b border-[var(--phone-border)]"
                  style={{ paddingBlock: 12 }}
                >
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => deleteAlarm(alarm.id)}
                      aria-label={`Delete ${display.time} ${display.period} alarm`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--phone-accent)]"
                    >
                      <LuCircleMinus className="size-6" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAlarmToEdit(alarm)}
                    aria-label={`Edit ${display.time} ${display.period} alarm, ${description}`}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-start rounded-lg text-left",
                      alarm.enabled
                        ? "text-[var(--phone-text)]"
                        : "text-[var(--phone-text-muted)]",
                    )}
                  >
                    <span className="flex items-baseline gap-1.5 tabular-nums">
                      <span className="text-[40px] leading-none font-light tracking-[-0.04em]">
                        {display.time}
                      </span>
                      <span className="text-[18px] leading-none font-light">
                        {display.period}
                      </span>
                    </span>
                    <span className="max-w-full truncate text-[12px] leading-relaxed">
                      {description}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={alarm.enabled}
                    aria-label={`${display.time} ${display.period} alarm, ${description}`}
                    onClick={() => toggleAlarm(alarm.id)}
                    className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative block h-[28px] w-[46px] rounded-full transition-colors motion-reduce:transition-none",
                        alarm.enabled
                          ? "bg-[var(--phone-accent)]"
                          : "bg-[var(--phone-border)]",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-[2px] left-[2px] size-6 rounded-full bg-[var(--phone-on-accent)] shadow-sm transition-transform duration-200 motion-reduce:transition-none",
                          alarm.enabled && "translate-x-[18px]",
                        )}
                      />
                    </span>
                  </button>
                </div>
              );
            })}
          </section>
        )}
      </div>

      {(isAdding || alarmToEdit) && (
        <AlarmModal
          container={editorContainer}
          setIsAdding={setIsAdding}
          alarmToEdit={alarmToEdit ?? undefined}
          setAlarmToEdit={setAlarmToEdit}
          isWakeUpAlarm={
            alarmToEdit ? alarmToEdit.isWakeUp === true : isAddingWakeUp
          }
        />
      )}
    </div>
  );
};
export default ClockAlarm;

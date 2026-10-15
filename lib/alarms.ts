import type { Alarm } from "@/types";

type AlarmRepeat = Pick<Alarm, "repeatMode" | "repeatDays">;
const dayOrder = [1, 2, 3, 4, 5, 6, 0];
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const getAlarmRepeatDays = (alarm: AlarmRepeat): number[] => {
  if (alarm.repeatMode === "daily") return [...dayOrder];
  if (alarm.repeatMode === "weekday") return [1, 2, 3, 4, 5];
  if (alarm.repeatMode === "custom")
    return dayOrder.filter((day) => alarm.repeatDays?.includes(day));
  return [];
};

export const getRepeatMode = (days: readonly number[]): Alarm["repeatMode"] => {
  const valid = dayOrder.filter((day) => days.includes(day));
  if (valid.length === 0) return "once";
  if (valid.length === 7) return "daily";
  if (valid.length === 5 && valid.every((day) => day >= 1 && day <= 5))
    return "weekday";
  return "custom";
};

export const getAlarmRepeatLabel = (alarm: AlarmRepeat): string => {
  const days = getAlarmRepeatDays(alarm);
  if (!days.length) return "Never";
  if (days.length === 7) return "Every day";
  if (days.length === 5 && days.every((day) => day >= 1 && day <= 5))
    return "Weekdays";
  if (days.length === 2 && days.includes(0) && days.includes(6))
    return "Weekends";
  return days.map((day) => dayLabels[day]).join(", ");
};

export const isAlarmScheduledForDate = (
  alarm: AlarmRepeat,
  date: Date,
): boolean =>
  alarm.repeatMode === "once" ||
  getAlarmRepeatDays(alarm).includes(date.getDay());

export const getAlarmTimeParts = (time: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return { time, period: "" };
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return { time, period: "" };
  return {
    time: `${hour % 12 || 12}:${match[2]}`,
    period: hour < 12 ? "AM" : "PM",
  };
};

export const getAlarmGroups = (alarms: readonly Alarm[]) => ({
  wakeUp: alarms.find((alarm) => alarm.isWakeUp) ?? null,
  regular: alarms
    .filter((alarm) => !alarm.isWakeUp)
    .sort((a, b) => a.time.localeCompare(b.time)),
});

export const getAlarmDescription = (alarm: Alarm) => {
  const label = alarm.label?.trim() || "Alarm";
  const repeat = alarm.repeatMode === "once" ? "" : getAlarmRepeatLabel(alarm);
  return repeat ? `${label}, ${repeat}` : label;
};

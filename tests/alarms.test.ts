import { describe, expect, it } from "vitest";
import {
  getAlarmDescription,
  getAlarmGroups,
  getAlarmTimeParts,
  getAlarmRepeatDays,
  getAlarmRepeatLabel,
  getRepeatMode,
  isAlarmScheduledForDate,
} from "@/lib/alarms";
import type { Alarm } from "@/types";

const alarm = (id: number, time: string): Alarm => ({
  id,
  time,
  label: null,
  enabled: true,
  repeatMode: "once",
});

describe("alarm presentation", () => {
  it("preserves legacy repeat settings and normalizes custom selections", () => {
    expect(getAlarmRepeatDays({ repeatMode: "weekday" })).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(getAlarmRepeatDays({ repeatMode: "daily" })).toHaveLength(7);
    expect(
      getAlarmRepeatDays({ repeatMode: "custom", repeatDays: [6, 0, 6, 9] }),
    ).toEqual([6, 0]);
    expect(getRepeatMode([])).toBe("once");
    expect(getRepeatMode([5, 4, 3, 2, 1])).toBe("weekday");
    expect(getRepeatMode([0, 1, 2, 3, 4, 5, 6])).toBe("daily");
    expect(getRepeatMode([0, 6])).toBe("custom");
    expect(getAlarmRepeatLabel({ repeatMode: "once" })).toBe("Never");
    expect(
      getAlarmRepeatLabel({ repeatMode: "custom", repeatDays: [6, 0] }),
    ).toBe("Weekends");
    expect(
      getAlarmDescription({
        ...alarm(1, "07:00"),
        repeatMode: "custom",
        repeatDays: [3, 1],
      }),
    ).toBe("Alarm, Mon, Wed");
  });

  it("only schedules recurring alarms on selected local weekdays", () => {
    const monday = new Date(2026, 9, 12, 7);
    const sunday = new Date(2026, 9, 18, 7);
    expect(isAlarmScheduledForDate({ repeatMode: "weekday" }, monday)).toBe(
      true,
    );
    expect(isAlarmScheduledForDate({ repeatMode: "weekday" }, sunday)).toBe(
      false,
    );
    expect(
      isAlarmScheduledForDate(
        { repeatMode: "custom", repeatDays: [0] },
        sunday,
      ),
    ).toBe(true);
    expect(
      isAlarmScheduledForDate(
        { repeatMode: "custom", repeatDays: [0] },
        monday,
      ),
    ).toBe(false);
    expect(isAlarmScheduledForDate({ repeatMode: "once" }, sunday)).toBe(true);
    expect(isAlarmScheduledForDate({ repeatMode: "daily" }, sunday)).toBe(true);
    expect(
      isAlarmScheduledForDate({ repeatMode: "custom", repeatDays: [] }, sunday),
    ).toBe(false);
  });
  it.each([
    ["00:00", "12:00", "AM"],
    ["06:05", "6:05", "AM"],
    ["12:00", "12:00", "PM"],
    ["23:59", "11:59", "PM"],
  ])(
    "formats %s without changing the stored 24-hour time",
    (input, time, period) => {
      expect(getAlarmTimeParts(input)).toEqual({ time, period });
    },
  );

  it.each(["24:00", "06:60", "invalid"])(
    "preserves an invalid legacy value %s without inventing a time",
    (time) => {
      expect(getAlarmTimeParts(time)).toEqual({ time, period: "" });
    },
  );

  it("separates the wake-up alarm and sorts regular alarms without mutating state", () => {
    const original = [
      alarm(1, "18:00"),
      { ...alarm(2, "07:00"), isWakeUp: true },
      alarm(3, "06:00"),
    ];
    const grouped = getAlarmGroups(original);
    expect(grouped.wakeUp?.id).toBe(2);
    expect(grouped.regular.map(({ id }) => id)).toEqual([3, 1]);
    expect(original.map(({ id }) => id)).toEqual([1, 2, 3]);
    expect(getAlarmGroups([])).toEqual({ wakeUp: null, regular: [] });
  });

  it("uses readable labels for empty labels and recurring alarms", () => {
    expect(getAlarmDescription(alarm(1, "06:00"))).toBe("Alarm");
    expect(
      getAlarmDescription({
        ...alarm(1, "06:00"),
        label: " Work ",
        repeatMode: "weekday",
      }),
    ).toBe("Work, Weekdays");
    expect(
      getAlarmDescription({ ...alarm(1, "06:00"), repeatMode: "daily" }),
    ).toBe("Alarm, Every day");
  });
});

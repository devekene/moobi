import { describe, expect, it, vi } from "vitest";
import { silenceClockRingingAudio } from "@/lib/clock-audio";

describe("virtual volume press while Clock rings", () => {
  it.each([
    [true, false],
    [false, true],
    [true, true],
    [false, false],
  ])(
    "silences only ringing sources (alarm=%s, timer=%s)",
    (alarmRinging, timerRinging) => {
      const alarm = { ringing: alarmRinging, audio: { pause: vi.fn() } };
      const timer = { ringing: timerRinging, audio: { pause: vi.fn() } };
      expect(silenceClockRingingAudio(alarm, timer)).toBe(
        alarmRinging || timerRinging,
      );
      expect(alarm.audio.pause).toHaveBeenCalledTimes(alarmRinging ? 1 : 0);
      expect(timer.audio.pause).toHaveBeenCalledTimes(timerRinging ? 1 : 0);
      expect(alarm.ringing).toBe(alarmRinging);
      expect(timer.ringing).toBe(timerRinging);
    },
  );

  it("keeps repeated volume presses consumed until ringing ends", () => {
    const alarm = { ringing: true, audio: { pause: vi.fn() } };
    const timer = { ringing: false, audio: null };
    expect(silenceClockRingingAudio(alarm, timer)).toBe(true);
    expect(silenceClockRingingAudio(alarm, timer)).toBe(true);
    alarm.ringing = false;
    expect(silenceClockRingingAudio(alarm, timer)).toBe(false);
    expect(alarm.audio.pause).toHaveBeenCalledTimes(2);
  });

  it("consumes ringing presses even when audio is unavailable or blocked", () => {
    expect(
      silenceClockRingingAudio(
        { ringing: true, audio: null },
        { ringing: false, audio: null },
      ),
    ).toBe(true);
  });
});

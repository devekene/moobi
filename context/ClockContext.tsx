"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  RefObject,
  SetStateAction,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useReducer,
  useState,
} from "react";
import { type Alarm, type ClockScreen, type Timezone } from "@/types";
import { isAlarmScheduledForDate } from "@/lib/alarms";
import { silenceClockRingingAudio } from "@/lib/clock-audio";
import {
  INITIAL_TIMER_STATE,
  getNextTimerTransition,
  timerReducer,
  type TimerAction,
  type TimerState,
} from "@/lib/timers";

interface ContextType {
  currentClockScreen: ClockScreen;
  setCurrentClockScreen: Dispatch<SetStateAction<ClockScreen>>;
  timezones: Timezone[];
  setTimezones: Dispatch<SetStateAction<Timezone[]>>;
  selectedTimezones: Timezone[];
  setSelectedTimezones: Dispatch<SetStateAction<Timezone[]>>;
  alarms: Alarm[];
  setAlarms: Dispatch<SetStateAction<Alarm[]>>;
  ringingAlarmId: number | null;
  setRingingAlarmId: Dispatch<SetStateAction<number | null>>;
  alarmAudioRef: RefObject<HTMLAudioElement | null>;
  silenceRingingAudio: () => boolean;

  // STOPWATCH
  elapsedSwTime: number;
  setElapsedSwTime: Dispatch<SetStateAction<number>>;
  stopwatchIsRunning: boolean;
  setStopwatchIsRunning: Dispatch<SetStateAction<boolean>>;

  // TIMER
  timer: TimerState;
  dispatchTimer: Dispatch<TimerAction>;
}

const ClockContext = createContext<ContextType | undefined>(undefined);

const formatAlarmKey = (date: Date, time: string) =>
  `${date.toISOString().slice(0, 10)}T${time}`;

const ClockProvider = ({ children }: { children: ReactNode }) => {
  const [currentClockScreen, setCurrentClockScreen] =
    useState<ClockScreen>("alarm");
  const [timezones, setTimezones] = useState<Timezone[]>([]);
  const [selectedTimezones, setSelectedTimezones] = useState<Timezone[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [ringingAlarmId, setRingingAlarmId] = useState<number | null>(null);
  const [elapsedSwTime, setElapsedSwTime] = useState(0);
  const [stopwatchIsRunning, setStopwatchIsRunning] = useState(false);

  // TIMER
  const [timer, dispatchTimer] = useReducer(timerReducer, INITIAL_TIMER_STATE);

  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const stopwatchRef = useRef<NodeJS.Timeout | null>(null);
  const timerAudioRef = useRef<HTMLAudioElement | null>(null);

  // ALARM
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const tryPlayAlarm = async () => {
      const audio = alarmAudioRef.current;
      if (!audio) return;

      audio.loop = true;
      audio.currentTime = 0;
      try {
        await audio.play();
      } catch (err) {
        console.warn("Autoplay blocked; user interaction required", err);
      }
    };

    const checkAlarms = () => {
      const d = new Date();
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      const hhmm = `${hh}:${mm}`;
      const key = formatAlarmKey(d, hhmm);

      setAlarms((prev) => {
        let updated = prev;
        for (const a of prev) {
          if (!a.enabled) continue;

          // Snooze check
          if (a.snoozeUntil && Date.now() >= a.snoozeUntil) {
            if (ringingAlarmId !== a.id) {
              setRingingAlarmId(a.id);
              tryPlayAlarm();
              updated = updated.map((x) =>
                x.id === a.id
                  ? { ...x, snoozeUntil: undefined, lastTriggerKey: key }
                  : x,
              );
              break;
            }
          }

          if (a.time === hhmm && isAlarmScheduledForDate(a, d)) {
            if (a.lastTriggerKey !== key) {
              setRingingAlarmId(a.id);
              tryPlayAlarm();
              updated = updated.map((x) =>
                x.id === a.id ? { ...x, lastTriggerKey: key } : x,
              );
              break;
            }
          }
        }
        return updated;
      });

      const now = new Date();
      const msUntilNextMinute =
        60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
      timeout = setTimeout(checkAlarms, msUntilNextMinute);
    };

    checkAlarms();
    return () => clearTimeout(timeout);
  }, [ringingAlarmId]);

  // STOPWATCH
  useEffect(() => {
    if (stopwatchIsRunning) {
      stopwatchRef.current = setInterval(
        () => setElapsedSwTime((v) => v + 10),
        10,
      );
    } else if (stopwatchRef.current) {
      clearInterval(stopwatchRef.current);
    }
    return () => {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, [stopwatchIsRunning]);

  const hasRunningTimer = timer.items.some((item) => item.status === "running");
  const hasRingingTimer = timer.items.some((item) => item.status === "ringing");
  const nextTimerTransition = getNextTimerTransition(timer.items);
  const silenceRingingAudio = useCallback(
    () =>
      silenceClockRingingAudio(
        { ringing: ringingAlarmId !== null, audio: alarmAudioRef.current },
        { ringing: hasRingingTimer, audio: timerAudioRef.current },
      ),
    [ringingAlarmId, hasRingingTimer],
  );

  useEffect(() => {
    if (!hasRunningTimer) return;
    let interval: number | undefined;
    const tick = () => dispatchTimer({ type: "tick", now: Date.now() });
    const syncVisibility = () => {
      window.clearInterval(interval);
      if (document.visibilityState === "visible") {
        tick();
        interval = window.setInterval(tick, 1000);
      }
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [hasRunningTimer]);

  useEffect(() => {
    if (nextTimerTransition === null) return;
    const tick = () => dispatchTimer({ type: "tick", now: Date.now() });
    const timeout = window.setTimeout(
      tick,
      Math.max(0, nextTimerTransition - Date.now()),
    );
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [nextTimerTransition]);

  useEffect(() => {
    const audio = timerAudioRef.current;
    if (!audio || !hasRingingTimer) return;
    audio.currentTime = 0;
    audio.loop = true;
    void audio.play().catch(() => {
      /* The nonmodal ringing banner remains available if autoplay is blocked. */
    });
    return () => audio.pause();
  }, [hasRingingTimer]);

  return (
    <ClockContext.Provider
      value={{
        timezones,
        selectedTimezones,
        currentClockScreen,
        setTimezones,
        setSelectedTimezones,
        setCurrentClockScreen,
        alarms,
        setAlarms,
        ringingAlarmId,
        setRingingAlarmId,
        alarmAudioRef,
        silenceRingingAudio,
        elapsedSwTime,
        setElapsedSwTime,
        stopwatchIsRunning,
        setStopwatchIsRunning,
        timer,
        dispatchTimer,
      }}
    >
      <audio
        ref={timerAudioRef}
        src="/sounds/alarm.wav"
        preload="none"
        className="hidden"
      />
      <audio
        ref={alarmAudioRef}
        src="/sounds/alarm.wav"
        preload="auto"
        className="hidden"
      />
      {children}
    </ClockContext.Provider>
  );
};

const useClock = () => {
  const context = useContext(ClockContext);

  if (context === undefined) {
    throw new Error("useClock must be used within a Clock Provider");
  }

  return context;
};

export { ClockProvider, useClock };

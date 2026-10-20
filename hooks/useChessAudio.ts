import { useCallback, useEffect, useRef } from "react";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";

export function useChessAudio(
  music: boolean,
  sounds: boolean,
  playing: boolean,
  moveCount: number,
) {
  const audio = useRef<AudioContext | null>(null);
  const previousMove = useRef(moveCount);
  const volume = usePhoneSettingsStore((state) => state.volume);
  const silent = usePhoneSettingsStore((state) => state.silentMode);
  const unlock = useCallback(() => {
    if (typeof AudioContext === "undefined") return;
    audio.current ??= new AudioContext();
    void audio.current.resume().catch(() => {});
  }, []);
  useEffect(() => {
    if (!music || !playing || silent || typeof AudioContext === "undefined")
      return;
    audio.current ??= new AudioContext();
    const context = audio.current;
    let active = true;
    const voices = new Set<OscillatorNode>();
    let step = 0;
    const chords = [
      [130.81, 164.81, 196],
      [110, 130.81, 164.81],
      [87.31, 130.81, 174.61],
      [98, 146.83, 196],
    ];
    const play = () => {
      if (!active || document.hidden || context.state !== "running") return;
      const chord = chords[step++ % chords.length];
      chord.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        const start = context.currentTime + index * 0.22;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime((0.025 * volume) / 100, start + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 3.4);
        oscillator.connect(gain).connect(context.destination);
        voices.add(oscillator);
        oscillator.start(start);
        oscillator.stop(start + 3.5);
        oscillator.onended = () => {
          voices.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        };
      });
    };
    void context
      .resume()
      .then(play)
      .catch(() => {});
    const interval = setInterval(play, 4000);
    const hide = () => {
      if (document.hidden) void context.suspend();
      else void context.resume().catch(() => {});
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      active = false;
      voices.forEach((voice) => {
        voice.stop();
        voice.disconnect();
      });
      voices.clear();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", hide);
      void context.suspend();
    };
  }, [music, playing, silent, volume]);
  useEffect(() => {
    const changed = moveCount > previousMove.current;
    previousMove.current = moveCount;
    const context = audio.current;
    if (!changed || !sounds || silent || !context || document.hidden) return;
    void context
      .resume()
      .then(() => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.setValueAtTime(520, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
          190,
          context.currentTime + 0.07,
        );
        gain.gain.setValueAtTime((0.06 * volume) / 100, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          context.currentTime + 0.09,
        );
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.1);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      })
      .catch(() => {});
  }, [moveCount, sounds, silent, volume]);
  useEffect(
    () => () => {
      void audio.current?.close();
      audio.current = null;
    },
    [],
  );
  return unlock;
}

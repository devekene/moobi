type RingingAudio = {
  ringing: boolean;
  audio: Pick<HTMLMediaElement, "pause"> | null;
};

/** Consume a volume press for ringing audio without changing either lifecycle. */
export const silenceClockRingingAudio = (
  alarm: RingingAudio,
  timer: RingingAudio,
): boolean => {
  for (const source of [alarm, timer]) {
    if (source.ringing) source.audio?.pause();
  }
  return alarm.ringing || timer.ringing;
};

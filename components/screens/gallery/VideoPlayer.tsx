"use client";

import { useEffect, useRef, useState } from "react";
import { LuPause, LuPlay, LuRotateCcw } from "react-icons/lu";
import { useSwipeable } from "react-swipeable";
import type { MediaItem } from "@/types";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import styles from "./gallery.module.css";

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
};

export default function VideoPlayer({
  media,
  goToNextMedia,
  goToPreviousMedia,
}: {
  media: MediaItem;
  goToNextMedia: () => void;
  goToPreviousMedia: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const volume = usePhoneSettingsStore((state) => state.volume);
  const silentMode = usePhoneSettingsStore((state) => state.silentMode);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume / 100;
    video.muted = silentMode;
  }, [silentMode, volume]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const seek = (nextTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    const boundedTime = Math.max(0, Math.min(duration, nextTime));
    video.currentTime = boundedTime;
    setCurrentTime(boundedTime);
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: goToNextMedia,
    onSwipedRight: goToPreviousMedia,
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 18,
  });

  return (
    <div className={styles.videoStage} {...swipeHandlers}>
      <video
        ref={videoRef}
        src={media.thumbnail}
        playsInline
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <button
        type="button"
        className={styles.playControl}
        onClick={togglePlayback}
        aria-label={isPlaying ? "Pause video" : "Play video"}
      >
        {isPlaying ? (
          <LuPause aria-hidden="true" />
        ) : (
          <LuPlay aria-hidden="true" />
        )}
      </button>
      <div className={styles.videoControls}>
        <span>{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={Math.max(duration, 0)}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Video progress"
        />
        <span>{formatTime(duration)}</span>
        <button
          type="button"
          onClick={() => seek(0)}
          aria-label="Restart video"
        >
          <LuRotateCcw aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

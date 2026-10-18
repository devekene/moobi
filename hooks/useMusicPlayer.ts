"use client";

import { useEffect, useRef } from "react";
import { useMusicStore } from "@/stores/useMusicStore";
import {
  getMusicAudio,
  playMusic,
  seekMusic,
  skipMusic,
  toggleMusic,
  toggleCollectionMusic,
} from "@/lib/music-playback";

export function useMusicPlayer() {
  const state = useMusicStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    audioRef.current = getMusicAudio();
  }, []);
  return {
    ...state,
    audioRef,
    playSong: playMusic,
    playPause: toggleMusic,
    playCollection: toggleCollectionMusic,
    skipForward: () => skipMusic(1),
    skipBackward: () => skipMusic(-1),
    setProgress: seekMusic,
  };
}

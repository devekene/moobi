"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMusicStore } from "@/stores";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import type { Song } from "@/types";

export function useMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    currentSong,
    queue,
    progress,
    isPlaying,
    isLoading,
    audioError,
    repeatMode,
    isShuffled,
    currentPlayerScreen,
    lastPlayerScreen,
    setCurrentSong,
    setQueue,
    setProgress,
    setIsPlaying,
    setIsLoading,
    setAudioError,
    setCurrentPlayerScreen,
    setLastPlayerScreen,
    setIsShuffled,
    toggleRepeat,
  } = useMusicStore();

  const volume = usePhoneSettingsStore((state) => state.volume);
  const silentMode = usePhoneSettingsStore((state) => state.silentMode);
  const setVolume = usePhoneSettingsStore((state) => state.setVolume);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Play a song
  const playSong = useCallback(
    async (song: Song) => {
      try {
        setAudioError(null);
        setCurrentSong(song);
        setIsLoading(true);
        setProgress([0]);
        setCurrentPlayerScreen("nowPlaying");

        const response = await fetch(`/api/music-player/stream?id=${song.id}`);
        const data = await response.json();

        if (data.success && audioRef.current) {
          audioRef.current.src = data.streamUrl;
          audioRef.current.load();

          audioRef.current.onloadedmetadata = () => {
            if (audioRef.current) {
              setIsPlaying(true);
              audioRef.current.play().catch((error) => {
                console.error("Error playing audio:", error);
                setAudioError("Failed to play audio");
              });
            }
          };

          audioRef.current.onerror = () => {
            setAudioError("Failed to load audio");
            setIsPlaying(false);
          };
        }
      } catch (error) {
        console.error("Error playing song:", error);
        setAudioError("Failed to load song");
      } finally {
        setIsLoading(false);
      }
    },
    [
      setAudioError,
      setCurrentSong,
      setIsLoading,
      setProgress,
      setCurrentPlayerScreen,
      setIsPlaying,
    ],
  );

  // Play/Pause toggle
  const playPause = useCallback(() => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
        setAudioError("Failed to play audio");
      });
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentSong, setIsPlaying, setAudioError]);

  // Skip to next song
  const skipForward = useCallback(() => {
    if (!currentSong || queue.length === 0) return;

    const currentIndex = queue.findIndex((song) => song.id === currentSong.id);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % queue.length;
    playSong(queue[nextIndex]);
  }, [currentSong, queue, playSong]);

  // Skip to previous song
  const skipBackward = useCallback(() => {
    if (!currentSong || queue.length === 0) return;

    const currentIndex = queue.findIndex((song) => song.id === currentSong.id);
    if (currentIndex === -1) return;

    const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
    playSong(queue[prevIndex]);
  }, [currentSong, queue, playSong]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.currentTime && audio.duration) {
        setProgress([audio.currentTime]);
      }
    };

    const handleEnded = () => {
      if (repeatMode === "one") {
        audio.currentTime = 0;
        audio.play();
      } else if (repeatMode === "all" || isShuffled) {
        skipForward();
      } else {
        setIsPlaying(false);
      }
    };

    const handleVolumeChange = () => {
      setVolume(audio.volume * 100);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("volumechange", handleVolumeChange);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [
    repeatMode,
    isShuffled,
    skipForward,
    setProgress,
    setIsPlaying,
    setVolume,
  ]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
      audioRef.current.muted = silentMode;
    }
  }, [silentMode, volume]);

  // Handle progress changes
  const handleProgressChange = useCallback(
    (newProgress: number[]) => {
      if (audioRef.current && currentSong) {
        audioRef.current.currentTime = newProgress[0];
        setProgress(newProgress);
      }
    },
    [currentSong, setProgress],
  );

  return {
    audioRef,
    queue,
    setQueue,
    currentSong,
    setCurrentSong,
    currentPlayerScreen,
    setCurrentPlayerScreen,
    lastPlayerScreen,
    setLastPlayerScreen,
    progress,
    setProgress: handleProgressChange,
    audioError,
    isPlaying,
    isLoading,
    playSong,
    playPause,
    skipForward,
    skipBackward,
    toggleRepeat,
    repeatMode,
    isShuffled,
    setIsShuffled,
  };
}

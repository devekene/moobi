"use client";

import React, { useState } from "react";
import {
  LuHeart,
  LuLoader,
  LuMusic,
  LuPause,
  LuPlay,
  LuSkipBack,
  LuSkipForward,
  LuVolume2,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { usePhoneStore } from "@/stores";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";

const MusicPlayerWidget = ({ className }: { className?: string }) => {
  const { setCurrentScreen } = usePhoneStore();
  const volume = usePhoneSettingsStore((state) => state.volume);
  const setVolume = usePhoneSettingsStore((state) => state.setVolume);
  const {
    isPlaying,
    currentSong,
    progress,
    setProgress,
    playPause,
    skipForward,
    skipBackward,
    isLoading,
    setCurrentPlayerScreen,
  } = useMusicPlayer();

  const [isLiked, setIsLiked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn("px-3 py-5", className)}>
      <div
        className={`rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          isExpanded ? "p-6" : "p-4"
        }`}
        onClick={toggleExpanded}
      >
        {/* Compact View */}
        {!isExpanded ? (
          <div className="">
            <div className="flex items-center gap-4">
              {/* Album Art */}
              <div className="from-purple-400 flex-center h-12 w-12 rounded-xl bg-gradient-to-br to-pink-400 shadow-lg">
                {currentSong?.albumArt ? (
                  <img
                    src={currentSong.albumArt}
                    alt={currentSong?.title}
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <LuMusic className="h-7 w-7 text-white" />
                )}
              </div>

              {/* Song Info */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {currentSong?.title}
                </div>
                <div className="truncate text-xs text-gray-400">
                  {currentSong?.artist}
                </div>
              </div>

              {/* Play/Pause Button */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  playPause();
                }}
                className="h-10 w-10 rounded-full border-0 bg-white/20 p-0 shadow-lg hover:bg-white/30"
              >
                {isPlaying ? (
                  <LuPause className="h-5 w-5 text-white" />
                ) : (
                  <LuPlay className="ml-0.5 h-5 w-5 text-white" />
                )}
              </Button>

              {/* Skip Forward */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  skipForward();
                }}
                className="h-8 w-8 rounded-full border-0 bg-white/10 p-0 hover:bg-white/20"
              >
                <LuSkipForward className="h-4 w-4 text-white" />
              </Button>
            </div>

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full rounded-full bg-white transition-all duration-1000"
                style={{
                  width: `${(progress[0] / (currentSong?.duration || 0)) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          /* Expanded View */
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div
                className="from-purple-400 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br to-pink-400 shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!currentSong) return;

                  setCurrentScreen("music-player");
                  setCurrentPlayerScreen("nowPlaying");
                }}
              >
                {currentSong?.albumArt ? (
                  <img
                    src={currentSong.albumArt}
                    alt={currentSong?.title}
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <LuMusic className="h-10 w-10 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {currentSong?.title}
                </div>
                <div className="truncate text-xs text-white/70">
                  {currentSong?.artist}
                </div>
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLiked(!isLiked);
                }}
                className={`h-10 w-10 rounded-full border-0 p-0 ${
                  isLiked
                    ? "bg-red-500/20 text-red-400"
                    : "bg-white/10 text-white/70"
                }`}
              >
                <LuHeart
                  className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`}
                />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Slider
                value={progress}
                onValueChange={setProgress}
                max={currentSong?.duration}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-white/60">
                <span>{formatTime(progress[0])}</span>
                <span>{formatTime(currentSong?.duration || 0)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-8">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  skipBackward();
                }}
                className="h-12 w-12 rounded-full border-0 bg-white/10 p-0 hover:bg-white/20"
              >
                <LuSkipBack className="h-6 w-6 text-white" />
              </Button>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  playPause();
                }}
                className="h-16 w-16 rounded-full border-0 bg-white p-0 shadow-xl hover:bg-white/90"
              >
                {!isLoading &&
                  (isPlaying ? (
                    <LuPause className="h-8 w-8 text-black" />
                  ) : (
                    <LuPlay className="ml-1 h-8 w-8 text-black" />
                  ))}

                {isLoading && (
                  <LuLoader className="spin-custom h-8 w-8 text-white" />
                )}
              </Button>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  skipForward();
                }}
                className="h-12 w-12 rounded-full border-0 bg-white/10 p-0 hover:bg-white/20"
              >
                <LuSkipForward className="h-6 w-6 text-white" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3">
              <LuVolume2 className="h-4 w-4 text-white/70" />
              <Slider
                value={[volume]}
                onValueChange={(value) => setVolume(value[0])}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="w-8 text-right text-xs text-white/60">
                {volume}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicPlayerWidget;

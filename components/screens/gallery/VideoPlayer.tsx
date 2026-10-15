"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { LuPause, LuPlay } from "react-icons/lu";
import { useSwipeable } from "react-swipeable";
import { GalleryMedia } from "@/types";
import { FaRedo } from "react-icons/fa";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";

const VideoPlayer = ({
  media,
  goToNextMedia,
  goToPreviousMedia,
}: {
  media: GalleryMedia;
  goToNextMedia: () => void;
  goToPreviousMedia: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const volume = usePhoneSettingsStore((state) => state.volume);
  const silentMode = usePhoneSettingsStore((state) => state.silentMode);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume / 100;
    video.muted = silentMode;
  }, [silentMode, volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => setDuration(video.duration);
    const updateTime = () => setCurrentTime(video.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("ended", handleEnded);
    };
  }, [media]);

  // Auto-hide controls after 2 seconds of inactivity
  useEffect(() => {
    if (showControls && isPlaying) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showControls, isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }

    setShowControls(true);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;

    video.currentTime = newTime;
    setCurrentTime(newTime);
    setShowControls(true);
  };

  const handleScreenTap = () => {
    setShowControls(!showControls);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = Math.max(
      0,
      Math.min(duration, video.currentTime + seconds),
    );
    video.currentTime = newTime;
    setCurrentTime(newTime);
    setShowControls(true);
  };

  const progressPercentage = (currentTime / duration) * 100;

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      goToNextMedia();
    },
    onSwipedRight: () => {
      goToPreviousMedia();
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 10,
  });

  return (
    <div className="relative h-[92%] w-full">
      <div
        className="relative h-[90%] w-full flex-1 cursor-pointer"
        onClick={handleScreenTap}
        {...swipeHandlers}
      >
        <video
          ref={videoRef}
          src={media.url}
          controls={false}
          autoPlay
          className="h-full w-full object-cover"
        />

        <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-3">
          <h1 className="text-lg font-semibold text-white">{media.title}</h1>
        </div>

        {/*  Skip/Play/Pause Buttons */}
        {showControls && (
          <div className="absolute top-1/2 flex w-full -translate-y-1/2 transform items-center justify-between px-6">
            {/* Skip Backward */}
            <button
              onClick={(e) => {
                e.stopPropagation();

                skip(-10);
              }}
              className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all duration-200 hover:bg-black/60"
            >
              <FaRedo className="rotate-180" />
              <span className="absolute -bottom-6 text-xs">10s</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();

                handlePlayPause();
              }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/30"
            >
              {isPlaying ? (
                <LuPause size={24} className="text-white" />
              ) : (
                <LuPlay size={24} className="text-white" />
              )}
            </button>

            {/* Skip Forward */}
            <button
              onClick={(e) => {
                e.stopPropagation();

                skip(10);
              }}
              className="flex-center h-12 w-12 rounded-full bg-black/40 text-white backdrop-blur-md transition-all duration-200 hover:bg-black/60"
            >
              <FaRedo />
              <span className="absolute -bottom-6 text-xs">10s</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div
        className={`absolute bottom-5 left-0 right-0 mb-4 p-6 transition-all duration-300 ${
          showControls ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div
          className="h-1 w-full cursor-pointer rounded-full bg-white/30 transition-all duration-200 hover:h-1.5"
          onClick={handleProgressClick}
        >
          <div
            className="relative h-full rounded-full bg-red-500 transition-all duration-200"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 transform rounded-full bg-red-500 opacity-0 transition-opacity duration-200 hover:opacity-100"></div>
          </div>
        </div>
        <div className="mt-1 flex justify-between text-xs text-white">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;

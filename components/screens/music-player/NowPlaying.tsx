import { useEffect, useState } from "react";
import {
  LuChevronDown,
  LuHeart,
  LuLoader,
  LuMusic,
  LuPause,
  LuPlay,
  LuRepeat,
  LuShuffle,
  LuSkipBack,
  LuSkipForward,
  LuUser,
  LuVolume2,
} from "react-icons/lu";
import { FiMoreHorizontal } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AiFillExclamationCircle } from "react-icons/ai";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";

const NowPlaying = () => {
  const volume = usePhoneSettingsStore((state) => state.volume);
  const setVolume = usePhoneSettingsStore((state) => state.setVolume);

  const {
    audioRef,
    setCurrentPlayerScreen,
    currentSong,
    audioError,
    setIsShuffled,
    skipForward,
    skipBackward,
    progress,
    setProgress,
    toggleRepeat,
    playPause,
    isPlaying,
    isShuffled,
    repeatMode,
    isLoading,
    lastPlayerScreen,
  } = useMusicPlayer();

  const [isLiked, setIsLiked] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateDuration = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };

    audio.addEventListener("durationchange", updateDuration);
    return () => audio.removeEventListener("durationchange", updateDuration);
  }, [audioRef, currentSong?.id]);

  if (!currentSong) {
    setCurrentPlayerScreen("library");
    return;
  }

  const handleProgressChange = (newProgress: number[]) => {
    if (audioRef.current && currentSong) {
      audioRef.current.currentTime = newProgress[0];
      setProgress(newProgress);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="from-purple-100 relative flex h-full w-full flex-col gap-5 overflow-hidden bg-gradient-to-b to-pink-100 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentPlayerScreen(lastPlayerScreen)}
          className="p-2 text-xs text-white"
        >
          <LuChevronDown className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="sm" className="cursor-default p-2">
          <FiMoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      {/* Song Info */}
      <div className="flex flex-col items-center gap-4">
        <div className="from-purple-400 flex h-40 w-40 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br to-pink-400 shadow-2xl">
          {currentSong.albumArt ? (
            <img
              src={currentSong.albumArt || "/placeholder.svg"}
              alt={currentSong.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <LuMusic className="h-24 w-24 text-white" />
          )}
        </div>

        <div className="text-center">
          <h1 className="mb-1 text-lg font-bold text-gray-400">
            {currentSong.title}
          </h1>
          <p className="text-sm text-gray-500">{currentSong.artist}</p>
        </div>
      </div>

      {/*Error Message */}
      {audioError && (
        <div className="absolute right-0 top-12 flex w-fit max-w-52 items-center gap-2 rounded border border-red-400 bg-red-200 p-2 px-6 py-2">
          <AiFillExclamationCircle />

          <span className="text-sm">{audioError}</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="px-3">
        <Slider
          value={progress}
          onValueChange={handleProgressChange}
          max={duration || currentSong.duration}
          step={1}
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>{formatTime(progress[0])}</span>
          <span>
            {formatTime(duration || currentSong.duration)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-3">
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsShuffled(!isShuffled)}
            className={`p-2 ${isShuffled ? "text-red-500" : "text-gray-500"}`}
          >
            <LuShuffle className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={skipBackward}
              className="p-2 text-gray-600"
            >
              <LuSkipBack className="h-6 w-6" />
            </Button>

            <Button
              onClick={playPause}
              disabled={!!audioError}
              className="h-16 w-16 rounded-full bg-white shadow-lg transition-shadow hover:shadow-xl disabled:opacity-50"
            >
              {!isLoading &&
                (isPlaying ? (
                  <LuPause className="h-8 w-8 text-black" />
                ) : (
                  <LuPlay className="ml-1 h-8 w-8 text-black" />
                ))}

              {isLoading && (
                <LuLoader className="spin-custom h-8 w-8 text-black" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={skipForward}
              className="p-2 text-gray-600"
            >
              <LuSkipForward className="h-6 w-6" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleRepeat}
            className={`gap-0.5 p-2 ${repeatMode !== "off" ? "text-red-500" : "text-gray-500"}`}
          >
            <LuRepeat className="h-5 w-5" />
            {repeatMode === "one" && <span className="text-xs">1</span>}
          </Button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLiked(!isLiked)}
            className={`p-2 ${isLiked ? "text-red-500" : "text-gray-600"}`}
          >
            <LuHeart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
          </Button>

          <div className="mx-4 flex max-w-32 flex-1 items-center gap-2">
            <LuVolume2 className="h-4 w-4 text-gray-600" />
            <Slider
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>

          <Button variant="ghost" size="sm" className="p-2">
            <LuUser className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </div>
    </div>
  );
};
export default NowPlaying;

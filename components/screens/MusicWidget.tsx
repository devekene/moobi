import {
  LuPause,
  LuPlay,
  LuRadio,
  LuSkipBack,
  LuSkipForward,
} from "react-icons/lu";

import type { Song } from "@/types";
import { cn } from "@/lib/utils";

type MusicWidgetProps = {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  canSkip: boolean;
  audioError: string | null;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
};

export default function MusicWidget({
  currentSong,
  isPlaying,
  isLoading,
  canSkip,
  audioError,
  onPlayPause,
  onPrevious,
  onNext,
  className,
}: MusicWidgetProps) {
  return (
    <div
      role="group"
      aria-label="Music playback controls"
      className={cn(
        `shadow-[ inset_0_1px_0_rgba(255,255,255,0.10), inset_0_-1px_0_rgba(0,0,0,0.06), 0_2px_6px_rgba(0,0,0,0.10) ] relative size-[143px] shrink-0 overflow-hidden rounded-[30px] border border-white/[0.08] bg-[var(--phone-control-center-module)] text-left text-white backdrop-blur-[28px] backdrop-saturate-[145%] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none`,
        className,
      )}
    >
      {/* Album art */}
      <span className="absolute top-[12px] left-[13px] size-[43px] overflow-hidden rounded-[9px] bg-white/[0.06]">
        {currentSong?.albumArt && (
          <img
            src={currentSong.albumArt}
            alt=""
            className="size-full object-cover"
          />
        )}
      </span>

      {/* AirPlay */}
      <span className="absolute top-[12px] right-[11px] flex size-[27px] items-center justify-center text-white/[0.82]">
        <LuRadio className="size-[18px]" aria-hidden="true" />
      </span>

      {/* Metadata */}
      <span className="absolute top-[68px] right-[13px] left-[13px] block overflow-hidden">
        <span className="block truncate text-[12px] leading-[15px] font-semibold tracking-[-0.15px]">
          {currentSong?.title ?? "Not Playing"}
        </span>

        {currentSong && (
          <span className="mt-[1px] block truncate text-[10px] leading-[13px] font-medium tracking-[-0.1px] text-white/[0.58]">
            {isLoading
              ? "Connecting…"
              : audioError
                ? "Playback unavailable. Try again."
                : currentSong.artist}
          </span>
        )}
      </span>

      <span role="status" className="sr-only">
        {audioError ?? (isLoading ? "Loading music" : "")}
      </span>

      <button
        type="button"
        aria-label="Previous track"
        onClick={onPrevious}
        disabled={!currentSong || !canSkip}
        className="absolute bottom-0 left-[3px] flex size-[44px] items-center justify-center rounded-full text-white/90 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none disabled:text-white/25"
      >
        <LuSkipBack className="size-[18px]" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={isPlaying ? "Pause music" : "Play music"}
        aria-busy={isLoading}
        onClick={onPlayPause}
        disabled={!currentSong || isLoading}
        className="absolute bottom-0 left-1/2 flex size-[44px] -translate-x-1/2 items-center justify-center rounded-full text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none disabled:text-white/25"
      >
        {isPlaying ? (
          <LuPause className="size-[25px]" aria-hidden="true" />
        ) : (
          <LuPlay className="size-[26px]" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        aria-label="Next track"
        onClick={onNext}
        disabled={!currentSong || !canSkip}
        className="absolute right-[3px] bottom-0 flex size-[44px] items-center justify-center rounded-full text-white/90 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none disabled:text-white/25"
      >
        <LuSkipForward className="size-[18px]" aria-hidden="true" />
      </button>
    </div>
  );
}

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
  onOpen: () => void;
  className?: string;
};

export default function MusicWidget({
  currentSong,
  isPlaying,
  onOpen,
  className,
}: MusicWidgetProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={
        currentSong
          ? `Open Music, ${currentSong.title} by ${currentSong.artist}`
          : "Open Music. Nothing is playing."
      }
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
            {currentSong.artist}
          </span>
        )}
      </span>

      {/* Previous */}
      <span
        aria-hidden="true"
        className="absolute bottom-[7px] left-[11px] flex size-[32px] items-center justify-center text-white/[0.18]"
      >
        <LuSkipBack className="size-[18px]" />
      </span>

      {/* Play / pause */}
      <span
        aria-hidden="true"
        className="absolute bottom-[5px] left-1/2 flex size-[38px] -translate-x-1/2 items-center justify-center text-white"
      >
        {isPlaying ? (
          <LuPause className="size-[25px]" />
        ) : (
          <LuPlay className="size-[26px]" />
        )}
      </span>

      {/* Next */}
      <span
        aria-hidden="true"
        className="absolute right-[11px] bottom-[7px] flex size-[32px] items-center justify-center text-white/[0.18]"
      >
        <LuSkipForward className="size-[18px]" />
      </span>
    </button>
  );
}

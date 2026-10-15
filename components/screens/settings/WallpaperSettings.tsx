"use client";

import { useId, useRef } from "react";
import HomeWallpaper from "@/components/screens/home/HomeWallpaper";
import { WALLPAPER_ACCEPT } from "@/lib/wallpaper";
import { useWallpaperStore } from "@/stores/useWallpaperStore";

export default function WallpaperSettings() {
  const { url, status, error, choose, reset, initialize } = useWallpaperStore();
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const busy = status !== "idle";
  const buttonClass =
    "min-h-11 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50";

  return (
    <div
      className="space-y-4 rounded-2xl bg-[var(--phone-surface)] p-4"
      aria-busy={busy}
    >
      <div
        className="relative mx-auto aspect-[9/19] w-36 overflow-hidden rounded-3xl border border-[var(--phone-border)] bg-[var(--phone-canvas)]"
        role="img"
        aria-label="Current Home Screen wallpaper preview"
      >
        <HomeWallpaper />
      </div>
      <p
        id={hintId}
        className="text-xs leading-relaxed text-[var(--phone-text-muted)]"
      >
        Choose a JPEG, PNG, WebP, or AVIF up to 15 MB. Your image fills the Home
        Screen with a centered crop. Saved only in this browser; never uploaded.
      </p>
      <input
        ref={input}
        type="file"
        accept={WALLPAPER_ACCEPT}
        aria-label="Choose Home Screen wallpaper"
        aria-describedby={hintId}
        className="hidden"
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void choose(file);
        }}
      />
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className={`${buttonClass} bg-[var(--phone-accent)] text-[var(--phone-on-accent)]`}
        >
          Choose photo
        </button>
        <button
          type="button"
          disabled={busy || (!url && !error)}
          onClick={() => void reset()}
          className={`${buttonClass} bg-[var(--phone-surface-elevated)] text-[var(--phone-text)]`}
        >
          Restore default
        </button>
      </div>
      <p role="status" className="text-xs text-[var(--phone-text-secondary)]">
        {status === "loading"
          ? "Loading wallpaper…"
          : status === "saving"
            ? "Saving wallpaper…"
            : error
              ? ""
              : url
                ? "Custom wallpaper saved."
                : "Using the default wallpaper."}
      </p>
      {error && (
        <div className="text-sm text-[var(--phone-text)]">
          <p role="alert">{error}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void initialize()}
            className={`${buttonClass} text-[var(--phone-accent)]`}
          >
            Retry loading
          </button>
        </div>
      )}
      <p className="text-xs leading-relaxed text-[var(--phone-text-muted)]">
        Clearing site data removes your wallpaper. Private browsing may keep it
        only until the session ends.
      </p>
    </div>
  );
}

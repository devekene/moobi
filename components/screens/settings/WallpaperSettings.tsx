"use client";

import { useId, useRef } from "react";
import {
  LuImagePlus,
  LuShieldCheck,
  LuSettings,
  LuCalendarDays,
  LuCloudSun,
  LuMusic2,
  LuNotebookPen,
  LuCalculator,
  LuClock3,
  LuCamera,
  LuPhone,
  LuGlobe,
  LuMail,
} from "react-icons/lu";
import HomeWallpaper from "@/components/screens/home/HomeWallpaper";
import { WALLPAPER_ACCEPT } from "@/lib/wallpaper";
import { useWallpaperStore } from "@/stores/useWallpaperStore";
import styles from "./settings.module.css";

export default function WallpaperSettings() {
  const { url, status, error, choose, reset, initialize } = useWallpaperStore();
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const busy = status !== "idle";
  const previewIcons = [
    LuSettings,
    LuCalendarDays,
    LuCloudSun,
    LuMusic2,
    LuNotebookPen,
    LuCalculator,
    LuClock3,
    LuCamera,
  ];
  return (
    <div className={styles.detailStack} aria-busy={busy}>
      <div className={styles.wallpaperStage}>
        <div
          className={styles.wallpaperPhone}
          role="img"
          aria-label="Current Home Screen wallpaper preview"
        >
          <HomeWallpaper fullOpacity />
          <div className={styles.wallpaperChrome} aria-hidden="true">
            <span className={styles.previewIsland} />
            <div className={styles.wallpaperWidgets}>
              <span>
                <LuCalendarDays />
              </span>
              <span>
                <LuCloudSun />
              </span>
            </div>
            <div className={styles.wallpaperApps}>
              {previewIcons.map((Icon, index) => (
                <i key={index}>
                  <Icon />
                </i>
              ))}
            </div>
            <div className={styles.wallpaperDock}>
              <i>
                <LuPhone />
              </i>
              <i>
                <LuGlobe />
              </i>
              <i>
                <LuMail />
              </i>
            </div>
            <span className={styles.previewHomeIndicator} />
          </div>
        </div>
        <p className={styles.previewCaption}>
          <span />
          Home Screen
        </p>
        <span className={styles.previewDescription}>
          {url ? "Your photo, your space." : "A fresh view, every time."}
        </span>
      </div>
      <div className={styles.wallpaperActions}>
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
        <button
          type="button"
          className={styles.primaryButton}
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <LuImagePlus aria-hidden="true" />
          Choose a photo
        </button>
        <button
          type="button"
          className={styles.textButton}
          disabled={busy || (!url && !error)}
          onClick={() => void reset()}
        >
          Restore default wallpaper
        </button>
        <p id={hintId} className={styles.fileHint}>
          JPEG, PNG, WebP or AVIF · Up to 15 MB
        </p>
      </div>
      <p role="status" className={styles.wallpaperStatus}>
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
        <div className={styles.notice}>
          <p role="alert" className={styles.error}>
            {error}
          </p>
          <button
            type="button"
            disabled={busy}
            className={styles.textButton}
            onClick={() => void initialize()}
          >
            Retry loading
          </button>
        </div>
      )}
      <div className={styles.privacyNote}>
        <LuShieldCheck aria-hidden="true" />
        <p>
          Saved only in this browser. Your photo is never uploaded. Clearing
          site data removes it; private browsing may keep it only for this
          session.
        </p>
      </div>
    </div>
  );
}

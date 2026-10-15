"use client";

import { useEffect } from "react";
import Image from "next/image";
import wallpaper from "@/public/images/wallpaper.webp";
import { useWallpaperStore } from "@/stores/useWallpaperStore";

export default function HomeWallpaper() {
  const url = useWallpaperStore((state) => state.url);
  const initialize = useWallpaperStore((state) => state.initialize);
  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <Image
      src={url ?? wallpaper.src}
      alt=""
      fill
      sizes="(max-width: 640px) 100vw, 400px"
      unoptimized={Boolean(url)}
      className="pointer-events-none absolute inset-0 z-0 object-cover"
      style={{ opacity: url ? 1 : "var(--phone-wallpaper-opacity, 0.35)" }}
      placeholder={url ? "empty" : "blur"}
      blurDataURL={wallpaper.blurDataURL}
    />
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LuArrowLeft,
  LuChevronLeft,
  LuChevronRight,
  LuHeart,
} from "react-icons/lu";
import { gallery } from "@/constants";
import { useGalleryStore } from "@/stores/useGalleryStore";
import AllMedia, { type GalleryTab } from "./AllMedia";
import ImageView from "./ImageView";
import VideoPlayer from "./VideoPlayer";
import styles from "./gallery.module.css";

const Gallery = () => {
  const screenshots = useGalleryStore((state) => state.screenshots);
  const galleryStatus = useGalleryStore((state) => state.status);
  const galleryError = useGalleryStore((state) => state.error);
  const initializeGallery = useGalleryStore((state) => state.initialize);
  const capturedItems = useMemo(
    () =>
      screenshots.map((screenshot) => ({
        id: screenshot.id,
        type: "photo" as const,
        thumbnail: screenshot.url,
        title: screenshot.title,
        date: new Date(screenshot.createdAt),
        isFavorite: false,
      })),
    [screenshots],
  );
  const items = useMemo(
    () => [...capturedItems, ...gallery.flatMap((group) => group.items)],
    [capturedItems],
  );
  const [activeTab, setActiveTab] = useState<GalleryTab>("library");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState(
    () =>
      new Set(items.filter((item) => item.isFavorite).map((item) => item.id)),
  );

  useEffect(() => {
    void initializeGallery();
  }, [initializeGallery]);

  const currentIndex = items.findIndex((item) => item.id === selectedId);
  const currentItem = currentIndex >= 0 ? items[currentIndex] : null;

  const move = (direction: -1 | 1) => {
    if (items.length === 0 || currentIndex < 0) return;
    const nextIndex = (currentIndex + direction + items.length) % items.length;
    setSelectedId(items[nextIndex].id);
  };

  const toggleFavorite = () => {
    if (!currentItem) return;
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(currentItem.id)) next.delete(currentItem.id);
      else next.add(currentItem.id);
      return next;
    });
  };

  if (currentItem) {
    const title = currentItem.title?.trim() || "Untitled moment";
    return (
      <section className={styles.viewer} aria-label={`${title} viewer`}>
        <header className={styles.viewerHeader}>
          <button
            type="button"
            className={styles.viewerBack}
            onClick={() => setSelectedId(null)}
            aria-label="Back to Gallery"
          >
            <LuArrowLeft aria-hidden="true" />
          </button>
          <div className={styles.viewerTitle}>
            <strong>{title}</strong>
            <span>
              {currentIndex + 1} of {items.length}
            </span>
          </div>
          <button
            type="button"
            className={styles.favoriteButton}
            aria-label={
              favoriteIds.has(currentItem.id)
                ? "Remove from favorites"
                : "Add to favorites"
            }
            aria-pressed={favoriteIds.has(currentItem.id)}
            onClick={toggleFavorite}
          >
            <LuHeart aria-hidden="true" />
          </button>
        </header>

        <div className={styles.viewerStage}>
          {currentItem.type === "video" ? (
            <VideoPlayer
              media={currentItem}
              goToNextMedia={() => move(1)}
              goToPreviousMedia={() => move(-1)}
            />
          ) : (
            <ImageView
              media={currentItem}
              goToNextMedia={() => move(1)}
              goToPreviousMedia={() => move(-1)}
            />
          )}
        </div>

        <footer className={styles.viewerFooter}>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous item"
          >
            <LuChevronLeft aria-hidden="true" />
            Previous
          </button>
          <span>{currentItem.type === "video" ? "Video" : "Photo"}</span>
          <button type="button" onClick={() => move(1)} aria-label="Next item">
            Next
            <LuChevronRight aria-hidden="true" />
          </button>
        </footer>
      </section>
    );
  }

  return (
    <AllMedia
      activeTab={activeTab}
      capturedItems={capturedItems}
      favoriteIds={favoriteIds}
      galleryError={galleryError}
      galleryStatus={galleryStatus}
      onOpenMedia={setSelectedId}
      onTabChange={setActiveTab}
    />
  );
};

export default Gallery;

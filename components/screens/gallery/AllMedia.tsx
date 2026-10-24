"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  LuAlbum,
  LuArrowLeft,
  LuHeart,
  LuImages,
  LuPlay,
  LuSparkles,
  LuVideo,
} from "react-icons/lu";
import { gallery } from "@/constants";
import type { MediaItem } from "@/types";
import styles from "./gallery.module.css";

export type GalleryTab = "library" | "highlights" | "albums";
type AlbumId = "all" | "favorites" | "videos";

interface AllMediaProps {
  activeTab: GalleryTab;
  capturedItems: readonly MediaItem[];
  favoriteIds: ReadonlySet<string>;
  galleryError: string | null;
  galleryStatus: "idle" | "loading" | "saving";
  onOpenMedia: (id: string) => void;
  onTabChange: (tab: GalleryTab) => void;
}

const bundledItems = gallery.flatMap((group) => group.items);

function MediaVisual({ item }: { item: MediaItem }) {
  if (item.type === "video") {
    return (
      <video
        src={item.thumbnail}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
    );
  }

  return (
    <Image
      src={item.thumbnail}
      alt=""
      fill
      sizes="(max-width: 480px) 50vw, 220px"
      loading="lazy"
      unoptimized={item.thumbnail.startsWith("blob:")}
    />
  );
}

function MediaTile({
  item,
  favorite,
  onOpenMedia,
  featured = false,
}: {
  item: MediaItem;
  favorite: boolean;
  onOpenMedia: (id: string) => void;
  featured?: boolean;
}) {
  const label =
    item.title?.trim() || (item.type === "video" ? "Video" : "Photo");
  return (
    <button
      type="button"
      className={featured ? styles.feature : styles.mediaTile}
      onClick={() => onOpenMedia(item.id)}
      aria-label={`Open ${label}`}
    >
      <MediaVisual item={item} />
      <span className={styles.mediaShade} aria-hidden="true" />
      {item.type === "video" && (
        <span className={styles.playBadge} aria-hidden="true">
          <LuPlay />
        </span>
      )}
      {favorite && (
        <span className={styles.favoriteMark} aria-label="Favorite">
          <LuHeart aria-hidden="true" />
        </span>
      )}
      {featured && (
        <span className={styles.featureCopy}>
          <small>Featured moment</small>
          <strong>{label}</strong>
          <span>Open to watch</span>
        </span>
      )}
    </button>
  );
}

export default function AllMedia({
  activeTab,
  capturedItems,
  favoriteIds,
  galleryError,
  galleryStatus,
  onOpenMedia,
  onTabChange,
}: AllMediaProps) {
  const [openAlbum, setOpenAlbum] = useState<AlbumId | null>(null);
  const allItems = useMemo(
    () => [...capturedItems, ...bundledItems],
    [capturedItems],
  );
  const favoriteItems = useMemo(
    () => allItems.filter((item) => favoriteIds.has(item.id)),
    [favoriteIds],
  );
  const videoItems = useMemo(
    () => allItems.filter((item) => item.type === "video"),
    [],
  );
  const featured = allItems[0];

  const albums = [
    {
      id: "all" as const,
      label: "All moments",
      items: allItems,
      icon: LuImages,
    },
    {
      id: "favorites" as const,
      label: "Favorites",
      items: favoriteItems,
      icon: LuHeart,
    },
    {
      id: "videos" as const,
      label: "Videos",
      items: videoItems,
      icon: LuVideo,
    },
  ];
  const selectedAlbum = albums.find((album) => album.id === openAlbum) ?? null;

  const changeTab = (tab: GalleryTab) => {
    setOpenAlbum(null);
    onTabChange(tab);
  };

  return (
    <section className={styles.app} aria-label="Gallery">
      <div className={styles.ambient} aria-hidden="true" />
      <main className={styles.scroller}>
        {selectedAlbum ? (
          <>
            <header className={styles.albumHeader}>
              <button
                type="button"
                onClick={() => setOpenAlbum(null)}
                aria-label="Back to albums"
              >
                <LuArrowLeft aria-hidden="true" />
              </button>
              <div>
                <span>Album</span>
                <h1>{selectedAlbum.label}</h1>
              </div>
            </header>
            <div className={styles.albumGrid}>
              {selectedAlbum.items.map((item) => (
                <MediaTile
                  key={item.id}
                  item={item}
                  favorite={favoriteIds.has(item.id)}
                  onOpenMedia={onOpenMedia}
                />
              ))}
            </div>
            {selectedAlbum.items.length === 0 && (
              <div className={styles.emptyState}>
                <LuHeart aria-hidden="true" />
                <strong>No favorites yet</strong>
                <span>
                  Tap the heart while viewing a moment to keep it here.
                </span>
              </div>
            )}
          </>
        ) : activeTab === "library" ? (
          <>
            <header className={styles.header}>
              <div>
                <span className={styles.eyebrow}>Your collection</span>
                <h1>Gallery</h1>
              </div>
              <span className={styles.count}>{allItems.length} moments</span>
            </header>

            {(galleryStatus === "loading" || galleryError) && (
              <p
                className={styles.galleryStatus}
                role={galleryError ? "alert" : "status"}
              >
                {galleryError ?? "Opening saved screenshots…"}
              </p>
            )}

            {featured && (
              <MediaTile
                item={featured}
                featured
                favorite={favoriteIds.has(featured.id)}
                onOpenMedia={onOpenMedia}
              />
            )}

            {capturedItems.length > 0 && (
              <section className={styles.collection}>
                <div className={styles.sectionHeading}>
                  <div>
                    <span>From this virtual phone</span>
                    <h2>Screenshots</h2>
                  </div>
                  <span>{capturedItems.length} saved</span>
                </div>
                <div className={styles.mediaGrid}>
                  {capturedItems.map((item) => (
                    <MediaTile
                      key={item.id}
                      item={item}
                      favorite={favoriteIds.has(item.id)}
                      onOpenMedia={onOpenMedia}
                    />
                  ))}
                </div>
              </section>
            )}

            {gallery.slice(1).map((group) => (
              <section className={styles.collection} key={group.title}>
                <div className={styles.sectionHeading}>
                  <div>
                    <h2>{group.title}</h2>
                  </div>
                  <span>{group.items.length} photos</span>
                </div>
                <div className={styles.mediaGrid}>
                  {group.items.map((item) => (
                    <MediaTile
                      key={item.id}
                      item={item}
                      favorite={favoriteIds.has(item.id)}
                      onOpenMedia={onOpenMedia}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : activeTab === "highlights" ? (
          <>
            <header className={styles.header}>
              <div>
                <span className={styles.eyebrow}>Made for you</span>
                <h1>Highlights</h1>
              </div>
            </header>
            <button
              type="button"
              className={styles.memoryCard}
              onClick={() => featured && onOpenMedia(featured.id)}
              disabled={!featured}
            >
              <span className={styles.memoryCollage} aria-hidden="true">
                {allItems.slice(0, 3).map((item) => (
                  <span key={item.id}>
                    <MediaVisual item={item} />
                  </span>
                ))}
              </span>
              <span className={styles.memoryCopy}>
                <span>This week</span>
                <strong>
                  Little moments,
                  <br />
                  beautifully kept.
                </strong>
                <small>{allItems.length} moments · Play memory</small>
              </span>
            </button>
            <p className={styles.highlightNote}>
              Highlights are created from screenshots and sample moments stored
              inside Moobi.
            </p>
          </>
        ) : (
          <>
            <header className={styles.header}>
              <div>
                <span className={styles.eyebrow}>Organized for you</span>
                <h1>Albums</h1>
              </div>
            </header>
            <div className={styles.albumList}>
              {albums.map((album) => {
                const cover = album.items[0] ?? allItems[0];
                const Icon = album.icon;
                return (
                  <button
                    type="button"
                    className={styles.albumCard}
                    key={album.id}
                    onClick={() => setOpenAlbum(album.id)}
                  >
                    <span className={styles.albumCover}>
                      {cover ? <MediaVisual item={cover} /> : <Icon />}
                    </span>
                    <span className={styles.albumCopy}>
                      <span className={styles.albumIcon}>
                        <Icon />
                      </span>
                      <span>
                        <strong>{album.label}</strong>
                        <small>{album.items.length} items</small>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>

      <nav className={styles.tabBar} aria-label="Gallery sections">
        <button
          type="button"
          aria-current={activeTab === "library" ? "page" : undefined}
          onClick={() => changeTab("library")}
        >
          <LuImages aria-hidden="true" />
          <span>Library</span>
        </button>
        <button
          type="button"
          aria-current={activeTab === "highlights" ? "page" : undefined}
          onClick={() => changeTab("highlights")}
        >
          <LuSparkles aria-hidden="true" />
          <span>Highlights</span>
        </button>
        <button
          type="button"
          aria-current={activeTab === "albums" ? "page" : undefined}
          onClick={() => changeTab("albums")}
        >
          <LuAlbum aria-hidden="true" />
          <span>Albums</span>
        </button>
      </nav>
    </section>
  );
}

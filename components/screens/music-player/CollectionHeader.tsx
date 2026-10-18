"use client";

import { LuPause, LuPlay } from "react-icons/lu";
import type { Song } from "@/types";
import Artwork from "./Artwork";
import styles from "./music.module.css";

export default function CollectionHeader({
  songs,
  currentSong,
  isPlaying,
  isLoading,
  audioError,
  onToggle,
}: {
  songs: readonly Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  audioError: string | null;
  onToggle: () => void;
}) {
  if (!songs.length) return null;
  const covers = songs.slice(0, 4);
  const isCollectionTrack = songs.some((song) => song.id === currentSong?.id);
  const playing = isCollectionTrack && isPlaying;
  const loading = isCollectionTrack && isLoading;

  return (
    <>
      <div className={styles.collectionCover}>
        <div
          className={styles.collectionCollage}
          data-count={covers.length}
          aria-hidden="true"
        >
          {covers.map((song) => (
            <div className={styles.collectionTile} key={song.id}>
              <Artwork song={song} />
            </div>
          ))}
        </div>
        <button
          className={styles.collectionPlay}
          aria-label={playing ? "Pause collection" : "Play collection"}
          aria-busy={loading}
          disabled={loading}
          onClick={onToggle}
        >
          {playing ? (
            <LuPause fill="currentColor" />
          ) : (
            <LuPlay fill="currentColor" />
          )}
        </button>
      </div>
      {isCollectionTrack && audioError && (
        <p className={styles.collectionError} role="alert">
          {audioError}
        </p>
      )}
    </>
  );
}

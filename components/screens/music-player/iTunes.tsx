"use client";

import { useEffect, useRef, useState } from "react";
import {
  LuArrowDown,
  LuArrowUpRight,
  LuAudioLines,
  LuBookmark,
  LuCheck,
  LuChevronDown,
  LuDisc3,
  LuHeart,
  LuListMusic,
  LuPause,
  LuPlay,
  LuRepeat,
  LuRepeat1,
  LuSearch,
  LuShuffle,
  LuSkipBack,
  LuSkipForward,
  LuVolume2,
  LuX,
} from "react-icons/lu";
import { Tabs, TabsContent, type TabItem } from "@/components/ui/tabs";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import { formatMusicTime, readMusicTracks } from "@/lib/music-catalog";
import type { Song } from "@/types";
import styles from "./music.module.css";
import QueueSheet from "./QueueSheet";
import Artwork from "./Artwork";
import CollectionHeader from "./CollectionHeader";

type Room = "discover" | "search" | "collection";

const musicTabs: readonly TabItem<Room>[] = [
  { value: "discover", label: "Discover", icon: <LuDisc3 /> },
  { value: "search", label: "Search", icon: <LuSearch /> },
  { value: "collection", label: "Collection", icon: <LuBookmark /> },
];

function RecordSculpture({ song }: { song?: Song }) {
  return (
    <div className={styles.sculpture} aria-hidden="true">
      <div className={styles.record}>
        <div className={styles.recordLabel}>
          {song?.albumArt ? (
            <Artwork key={song.id} song={song} />
          ) : (
            <span>f.</span>
          )}
          <i />
        </div>
      </div>
      <div className={styles.needle} />
    </div>
  );
}

export default function MusicPlayer() {
  const player = useMusicPlayer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const queueTriggerRef = useRef<HTMLButtonElement>(null);
  const {
    currentSong,
    currentPlayerScreen,
    setCurrentPlayerScreen,
    isPlaying,
    isLoading,
    savedSongs,
    toggleSavedSong,
  } = player;
  const [room, setRoom] = useState<Room>(
    currentPlayerScreen === "search" ? "search" : "discover",
  );
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Song[]>([]);
  const [results, setResults] = useState<Song[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [searchStatus, setSearchStatus] = useState<
    "loading" | "ready" | "error"
  >("ready");
  const [retry, setRetry] = useState(0);
  const [genre, setGenre] = useState("All sounds");
  const [showQueue, setShowQueue] = useState(false);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [currentPlayerScreen]);
  const volume = usePhoneSettingsStore((state) => state.volume);
  const setVolume = usePhoneSettingsStore((state) => state.setVolume);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/music-player/tracks?limit=30", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return readMusicTracks(await response.json());
      })
      .then((songs) => {
        setTracks(songs);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `/api/music-player/search?q=${encodeURIComponent(query.trim())}&limit=30`,
        { signal: controller.signal },
      )
        .then(async (response) => {
          if (!response.ok) throw new Error();
          return readMusicTracks(await response.json());
        })
        .then((songs) => {
          setResults(songs);
          setSearchStatus("ready");
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearchStatus("error");
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, retry]);

  const genres = [
    "All sounds",
    ...Array.from(new Set(tracks.map((song) => song.genre))).slice(0, 5),
  ];
  const visibleTracks =
    room === "collection"
      ? savedSongs
      : room === "search"
        ? query.trim()
          ? results
          : []
        : tracks.filter(
            (song) => genre === "All sounds" || song.genre === genre,
          );
  const start = (song: Song, songs = visibleTracks) => {
    player.setQueue(songs);
    void player.playSong(song);
  };
  const navigate = (next: Room) => {
    scrollRef.current?.scrollTo(0, 0);
    setRoom(next);
    setShowQueue(false);
    setCurrentPlayerScreen(next === "search" ? "search" : "library");
  };
  const isSaved = (song: Song) =>
    savedSongs.some((saved) => saved.id === song.id);
  const expanded = currentPlayerScreen === "nowPlaying" && currentSong;
  const duration = player.duration || currentSong?.duration;
  const total =
    duration && Number.isFinite(duration)
      ? duration
      : currentSong?.duration || 0;
  const loading =
    room === "search"
      ? Boolean(query.trim()) && searchStatus === "loading"
      : room === "discover" && status === "loading";
  const error =
    room === "search"
      ? Boolean(query.trim()) && searchStatus === "error"
      : room === "discover" && status === "error";

  const trackRows = (songs: Song[]) => (
    <div className={styles.tracks}>
      {songs.map((song, index) => (
        <div
          className={`${styles.track} ${song.id === currentSong?.id ? styles.currentTrack : ""}`}
          key={song.id}
        >
          <button
            className={styles.trackMain}
            onClick={() => start(song, songs)}
            aria-label={`Play ${song.title} by ${song.artist}`}
          >
            <span className={styles.trackNumber}>
              {song.id === currentSong?.id && isPlaying ? (
                <LuAudioLines />
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            <span className={styles.trackArt}>
              <Artwork key={song.id} song={song} />
            </span>
            <span className={styles.trackInfo}>
              <strong>{song.title}</strong>
              <span>{song.artist}</span>
            </span>
            <span className={styles.trackDuration}>
              {formatMusicTime(song.duration)}
            </span>
          </button>
          <button
            className={styles.saveTrack}
            aria-label={`${isSaved(song) ? "Unsave" : "Save"} ${song.title}`}
            aria-pressed={isSaved(song)}
            onClick={() => toggleSavedSong(song)}
          >
            {isSaved(song) ? <LuCheck /> : <LuPlusIcon />}
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <Tabs
      items={musicTabs}
      value={room}
      onValueChange={navigate}
      activeColor="var(--phone-music-accent)"
      label="Music navigation"
      className={styles.app}
      listClassName={expanded ? "hidden" : styles.tabList}
    >
      <TabsContent value={room} ref={scrollRef} className={styles.scroll}>
        {expanded ? (
          <section className={styles.nowPlaying}>
            <header className={styles.playerHeader}>
              <button
                className={styles.iconButton}
                aria-label="Close player"
                onClick={() => {
                  setShowQueue(false);
                  setCurrentPlayerScreen(
                    room === "search" ? "search" : "library",
                  );
                }}
              >
                <LuChevronDown />
              </button>
              <span>THE LISTENING ROOM</span>
              <button
                className={styles.iconButton}
                ref={queueTriggerRef}
                aria-label="Show play queue"
                aria-haspopup="dialog"
                aria-expanded={showQueue}
                aria-controls={showQueue ? "music-queue-sheet" : undefined}
                onClick={() => setShowQueue(!showQueue)}
              >
                <LuListMusic />
              </button>
            </header>
            <div className={styles.playerArt}>
              <span className={styles.artCorner}>
                FORM RECORDS®
                <br />
                SIDE A / {currentSong.genre}
              </span>
              <RecordSculpture song={currentSong} />
              <span className={styles.artBottom}>
                A SOUND
                <br />
                <em>of your own.</em>
              </span>
              <span className={styles.artEdition}>VOL. 001</span>
            </div>
            <div className={styles.songHeading}>
              <div>
                <h1>{currentSong.title}</h1>
                <p>{currentSong.artist}</p>
              </div>
              <button
                className={styles.iconButton}
                aria-label={
                  isSaved(currentSong)
                    ? "Unsave current track"
                    : "Save current track"
                }
                aria-pressed={isSaved(currentSong)}
                onClick={() => toggleSavedSong(currentSong)}
              >
                <LuHeart
                  fill={isSaved(currentSong) ? "currentColor" : "none"}
                />
              </button>
            </div>
            <div className={styles.seek}>
              <input
                type="range"
                aria-label="Playback position"
                min={0}
                max={total || 1}
                step={1}
                value={Math.min(player.progress[0], total)}
                onChange={(event) =>
                  player.setProgress([Number(event.target.value)])
                }
              />
              <div>
                <span>{formatMusicTime(player.progress[0])}</span>
                <span>{formatMusicTime(total)}</span>
              </div>
            </div>
            <div className={styles.transport}>
              <button
                className={styles.iconButton}
                aria-label="Shuffle"
                aria-pressed={player.isShuffled}
                onClick={() => player.setIsShuffled(!player.isShuffled)}
              >
                <LuShuffle />
              </button>
              <button
                className={styles.iconButton}
                aria-label="Previous track"
                onClick={player.skipBackward}
              >
                <LuSkipBack fill="currentColor" />
              </button>
              <button
                className={styles.mainPlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                aria-busy={isLoading}
                onClick={player.playPause}
              >
                {isPlaying ? (
                  <LuPause fill="currentColor" />
                ) : (
                  <LuPlay fill="currentColor" />
                )}
              </button>
              <button
                className={styles.iconButton}
                aria-label="Next track"
                onClick={player.skipForward}
              >
                <LuSkipForward fill="currentColor" />
              </button>
              <button
                className={styles.iconButton}
                aria-label={`Repeat: ${player.repeatMode}`}
                aria-pressed={player.repeatMode !== "off"}
                onClick={player.toggleRepeat}
              >
                {player.repeatMode === "one" ? <LuRepeat1 /> : <LuRepeat />}
              </button>
            </div>
            {player.audioError ? (
              <p className={styles.playbackStatus} role="alert">
                {player.audioError}
              </p>
            ) : (
              <p className={styles.playbackStatus} role="status">
                {isLoading ? "Finding your sound…" : "STREAMING VIA AUDIUS"}
              </p>
            )}
            <label className={styles.volume}>
              <LuVolume2 />
              <input
                type="range"
                aria-label="Music volume"
                min={0}
                max={100}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
              />
              <span>{volume}%</span>
            </label>
          </section>
        ) : (
          <>
            <header className={styles.header}>
              <button
                className={styles.wordmark}
                onClick={() => navigate("discover")}
                aria-label="FORM music home"
              >
                form<span>®</span>
              </button>
              <button
                className={styles.iconButton}
                aria-label="Search music"
                onClick={() => navigate("search")}
              >
                <LuSearch />
              </button>
            </header>
            {room === "search" ? (
              <label className={styles.search}>
                <LuSearch />
                <input
                  aria-label="Search songs or artists"
                  placeholder="A song. An artist. A feeling."
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setResults([]);
                    setSearchStatus("loading");
                  }}
                />
                {query && (
                  <button
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                    }}
                  >
                    <LuX />
                  </button>
                )}
              </label>
            ) : room === "discover" ? (
              <>
                <button
                  className={styles.feature}
                  disabled={!tracks.length}
                  onClick={() => tracks[0] && start(tracks[0], tracks)}
                  aria-label="Play The Daily Form mix"
                >
                  <div className={styles.featureTop}>
                    <span>THE DAILY FORM</span>
                    <span>01 — 30</span>
                  </div>
                  <RecordSculpture />
                  <div className={styles.featureBottom}>
                    <div>
                      <span>A LITTLE ESCAPE</span>
                      <h2>
                        Out of the
                        <br />
                        <em>ordinary.</em>
                      </h2>
                    </div>
                    <span className={styles.featurePlay}>
                      <LuPlay fill="currentColor" />
                    </span>
                  </div>
                </button>
                <div className={styles.featureCaption}>
                  <span>A fresh perspective. Every day.</span>
                  <span>
                    <LuAudioLines /> {tracks.length || "—"} tracks
                  </span>
                </div>
                <div
                  className={styles.filters}
                  aria-label="Filter music by genre"
                >
                  {genres.map((item) => (
                    <button
                      key={item}
                      aria-pressed={genre === item}
                      onClick={() => setGenre(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <CollectionHeader
                songs={savedSongs}
                currentSong={currentSong}
                isPlaying={isPlaying}
                isLoading={isLoading}
                audioError={player.audioError}
                onToggle={player.playCollection}
              />
            )}
            <div className={styles.sectionHeading}>
              <h2>
                {room === "collection"
                  ? "The collection"
                  : room === "search"
                    ? query.trim()
                      ? "The finds"
                      : "Open possibilities"
                    : "In heavy rotation"}
              </h2>
              <span>
                {room === "discover" ? (
                  <LuArrowDown />
                ) : (
                  `${visibleTracks.length} TRACKS`
                )}
              </span>
            </div>
            {loading ? (
              <div className={styles.skeleton} role="status">
                <span />
                <span />
                <span />
                <p>Finding your next favorite…</p>
              </div>
            ) : error ? (
              <div className={styles.empty} role="alert">
                <LuAudioLines />
                <h3>A moment of silence.</h3>
                <p>We couldn’t reach the music catalog.</p>
                <button
                  onClick={() => {
                    if (room === "search") setSearchStatus("loading");
                    else setStatus("loading");
                    setRetry(retry + 1);
                  }}
                >
                  Try again <LuArrowUpRight />
                </button>
              </div>
            ) : visibleTracks.length ? (
              trackRows(visibleTracks)
            ) : (
              <div className={styles.empty}>
                <LuDisc3 />
                <h3>
                  {room === "collection"
                    ? "Make it yours."
                    : room === "search" && !query.trim()
                      ? "Every sound starts somewhere."
                      : "Nothing on this frequency."}
                </h3>
                <p>
                  {room === "collection"
                    ? "Tap + beside a track to keep it in your collection."
                    : room === "search"
                      ? "Search for songs and artists on Audius."
                      : "Try another sound, or come back for a fresh selection."}
                </p>
                {room === "collection" && (
                  <button onClick={() => navigate("discover")}>
                    Find your first track <LuArrowUpRight />
                  </button>
                )}
              </div>
            )}
            <footer className={styles.catalogFooter}>
              <span>POWERED BY AUDIUS ↗</span>
            </footer>
          </>
        )}
      </TabsContent>
      {!expanded && currentSong && (
        <div className={styles.bottom}>
          {currentSong && (
            <div className={styles.miniPlayer}>
              <button
                className={styles.miniInfo}
                aria-label={`Open player for ${currentSong.title}`}
                onClick={() => setCurrentPlayerScreen("nowPlaying")}
              >
                <span className={styles.miniArt}>
                  <Artwork key={currentSong.id} song={currentSong} />
                </span>
                <span>
                  <strong>{currentSong.title}</strong>
                  <small>
                    {isLoading ? "Connecting…" : currentSong.artist}
                  </small>
                </span>
              </button>
              <button
                className={styles.iconButton}
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={player.playPause}
              >
                {isPlaying ? (
                  <LuPause fill="currentColor" />
                ) : (
                  <LuPlay fill="currentColor" />
                )}
              </button>
              <button
                className={styles.iconButton}
                aria-label="Next track"
                onClick={player.skipForward}
              >
                <LuSkipForward fill="currentColor" />
              </button>
            </div>
          )}
        </div>
      )}
      <QueueSheet
        open={Boolean(expanded) && showQueue}
        onOpenChange={setShowQueue}
        trackCount={player.queue.length}
        returnFocus={queueTriggerRef}
      >
        {player.queue.length ? (
          trackRows(player.queue)
        ) : (
          <div className={styles.empty}>
            <LuListMusic aria-hidden="true" />
            <h3>A little room for sound.</h3>
            <p>
              Your queue is empty. Choose a track from Discover or your
              collection.
            </p>
          </div>
        )}
      </QueueSheet>
    </Tabs>
  );
}

function LuPlusIcon() {
  return (
    <span aria-hidden="true" className={styles.plus}>
      +
    </span>
  );
}

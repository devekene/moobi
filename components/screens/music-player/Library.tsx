import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LuAlbum, LuMusic, LuSearch } from "react-icons/lu";
import { FiMoreHorizontal } from "react-icons/fi";
import Loader from "@/components/Loader";
import { Song } from "@/types";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";

const Library = () => {
  const { setCurrentPlayerScreen, setQueue, playSong } = useMusicPlayer();
  const [tracks, setTracks] = useState<Song[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const fetchTrendingTracks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/music-player/tracks?limit=20");
      const data = await response.json();

      if (data.success) {
        setTracks(data.data);
      } else {
        console.error("Failed to fetch tracks:", data.error);
      }
    } catch (error) {
      console.error("Error fetching tracks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tracks.length === 0) {
      const timeoutId = setTimeout(() => void fetchTrendingTracks(), 0);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  const handlePlaySong = async (song: Song) => {
    const trackIndex = tracks.findIndex((track) => track.id === song.id);
    const newQueue = tracks.slice(trackIndex);

    setQueue(newQueue);
    await playSong(song);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-1 flex-col px-3 pt-8">
      {/* Header */}
      <div className="mt-6 px-1">
        <div className="mb-4 flex items-center justify-between text-neutral-300">
          <h1 className="text-3xl font-bold">iTunes</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPlayerScreen("search")}
            className="p-2"
          >
            <LuSearch className="h-5 w-5" />
          </Button>
        </div>

        {/* Quick Access */}
        <div className="mb-4 flex gap-4">
          <div className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-white">
            <LuMusic className="h-4 w-4" />
            <span className="text-sm font-medium">Trending</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-gray-700">
            <LuAlbum className="h-4 w-4" />
            <span className="text-sm font-medium">Playlists</span>
          </div>
        </div>
      </div>

      {/* Song List */}
      <div className="flex-1">
        {isLoading ? (
          <Loader />
        ) : (
          <div className="mt-2">
            <h2 className="mb-3 text-lg font-semibold text-gray-300">
              Recommended for today
            </h2>
            <div className="no-visible-scrollbar flex w-full gap-3 overflow-x-scroll">
              {tracks.slice(0, 6).map((song) => (
                <div
                  key={song.id}
                  className="group flex w-44 flex-col gap-3 rounded-lg border !border-neutral-900 p-3 transition-colors duration-150 hover:bg-gray-50 active:bg-gray-100"
                  onClick={() => playSong(song)}
                >
                  <div className="from-purple-400 flex-center h-32 w-32 overflow-hidden rounded-lg bg-gradient-to-br to-pink-400">
                    {song.albumArt ? (
                      <img
                        src={song.albumArt || "/images/no-img.webp"}
                        alt={song.title}
                        width={100}
                        height={100}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <LuMusic className="h-6 w-6 text-white" />
                    )}
                  </div>

                  <div className="max-w-28 flex-1">
                    <div className="truncate text-sm font-medium text-gray-200 group-hover:text-gray-500">
                      {song.title}
                    </div>
                    <div className="truncate text-xs text-gray-400">
                      {song.artist}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mb-3 mt-4 text-lg font-semibold text-gray-300">
              Trending Songs
            </h2>
            <div className="flex w-full flex-col gap-3">
              {tracks.slice(6).map((song) => (
                <div
                  key={song.id}
                  className="group flex items-center gap-3 rounded-lg px-1 py-1 transition-colors duration-150 hover:bg-gray-50 active:bg-gray-100"
                  onClick={() => handlePlaySong(song)}
                >
                  {/* Album Art */}
                  <div className="from-purple-400 flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br to-pink-400">
                    {song.albumArt ? (
                      <img
                        src={song.albumArt || "/placeholder.svg"}
                        alt={song.title}
                        width={100}
                        height={100}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <LuMusic className="h-6 w-6 text-white" />
                    )}
                  </div>

                  {/* Song Info */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-200 group-hover:text-gray-700">
                      {song.title}
                    </div>
                    <div className="truncate text-xs text-gray-400">
                      {song.artist}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="text-xs text-gray-400">
                    {formatTime(song.duration)}
                  </div>

                  {/* More Options */}
                  <Button variant="ghost" size="sm" className="p-1">
                    <FiMoreHorizontal className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default Library;

"use client";

import { useState } from "react";
import { LuDisc3 } from "react-icons/lu";
import type { Song } from "@/types";

export default function Artwork({ song }: { song: Song }) {
  const [failed, setFailed] = useState(false);
  return song.albumArt && !failed ? (
    <img
      src={song.albumArt}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <LuDisc3 aria-hidden="true" />
  );
}

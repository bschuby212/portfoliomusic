import {
  EXPAND_DIRECTION,
  PLAYLIST_NAME,
  SPOTIFY_PLAYLIST_URL,
  USE_FILLER_PLAYLIST,
} from "@/components/music-player/playlist";
import type { ExpandDirection } from "@/components/music-player/types";

export type PlayerConfig = {
  expandDirection: ExpandDirection;
  useFillerPlaylist: boolean;
  playlistUrl: string;
  playlistName: string;
};

function parseExpandDirection(value: string | undefined | null): ExpandDirection | null {
  if (value === "up" || value === "down") return value;
  return null;
}

/** Server/runtime expand direction: env wins, then playlist.ts default. */
export function getExpandDirection(): ExpandDirection {
  const fromEnv = parseExpandDirection(
    process.env.PLAYER_EXPAND_DIRECTION ?? process.env.NEXT_PUBLIC_PLAYER_EXPAND_DIRECTION,
  );
  return fromEnv ?? EXPAND_DIRECTION;
}

export function getPlayerConfig(): PlayerConfig {
  return {
    expandDirection: getExpandDirection(),
    useFillerPlaylist: USE_FILLER_PLAYLIST,
    playlistUrl: SPOTIFY_PLAYLIST_URL,
    playlistName: PLAYLIST_NAME,
  };
}

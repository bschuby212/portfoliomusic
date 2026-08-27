import type { PlaylistEntry } from "./types";

export const PLAYLIST_NAME = "Blake's Playlist";

/** Public Spotify playlist used as the content source. */
export const SPOTIFY_PLAYLIST_URL =
  "https://open.spotify.com/playlist/5zXp8gIyEeJteiSZj1RTqJ";

/**
 * After this many playlist songs, insert the surprise track.
 * Songs 1–4 are random from the playlist; song 5 is Always Rick.
 */
export const SURPRISE_AFTER = 4;

export const SURPRISE_TRACK: PlaylistEntry = {
  spotifyUrl: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
  audioSrc: "/audio/never-gonna-give-you-up.mp3",
};

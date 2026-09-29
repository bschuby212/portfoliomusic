import type { PlaylistEntry } from "./types";

export const PLAYLIST_NAME = "Blake's Playlist";

/**
 * Temporary: play local filler audio + Spotify metadata links.
 * Flip to false and set SPOTIFY_PLAYLIST_URL when Blake sends the real playlist.
 */
export const USE_FILLER_PLAYLIST = true;

/** Public Spotify playlist used when USE_FILLER_PLAYLIST is false. */
export const SPOTIFY_PLAYLIST_URL =
  "https://open.spotify.com/playlist/5zXp8gIyEeJteiSZj1RTqJ";

/**
 * After this many playlist songs, insert the surprise track.
 * Songs 1–4 are from the playlist; song 5 is Always Rick.
 */
export const SURPRISE_AFTER = 4;

export const SURPRISE_TRACK: PlaylistEntry = {
  spotifyUrl: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
  audioSrc: "/audio/never-gonna-give-you-up.mp3",
};

/**
 * Filler tracks: Spotify URLs supply title/artist/art; audioSrc is playable now.
 * Swap these Spotify links (and drop audioSrc) when the real playlist is ready.
 */
export const FILLER_TRACKS: PlaylistEntry[] = [
  {
    spotifyUrl: "https://open.spotify.com/track/4sebUbjqbcgDSwG6PbSGI0",
    audioSrc: "/audio/track-a.mp3",
  },
  {
    spotifyUrl: "https://open.spotify.com/track/6gSKswfcoWvaadqvuMF3Y7",
    audioSrc: "/audio/track-b.mp3",
  },
  {
    spotifyUrl: "https://open.spotify.com/track/4iEOVEULZRvmzYSZY2ViKN",
    audioSrc: "/audio/man-of-the-year.mp3",
  },
  {
    spotifyUrl: "https://open.spotify.com/track/0Fe3WxeO6lZZxj7ytvbDUh",
    audioSrc: "/audio/track-a.mp3",
  },
  {
    spotifyUrl: "https://open.spotify.com/track/3AJwUDP919kvQ9QcozQPxg",
    audioSrc: "/audio/track-b.mp3",
  },
  {
    spotifyUrl: "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b",
    audioSrc: "/audio/man-of-the-year.mp3",
  },
];

const SPOTIFY_ID = /^[A-Za-z0-9]+$/;

export function parseSpotifyTrackId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const uri = trimmed.match(/^spotify:track:([A-Za-z0-9]+)/i);
  if (uri) return uri[1];

  try {
    const url = new URL(trimmed);
    if (!url.hostname.endsWith("spotify.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const trackIndex = parts.findIndex((part) => part === "track");
    if (trackIndex === -1) return null;
    const id = parts[trackIndex + 1];
    return id && SPOTIFY_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function parseSpotifyPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const uri = trimmed.match(/^spotify:playlist:([A-Za-z0-9]+)/i);
  if (uri) return uri[1];

  try {
    const url = new URL(trimmed);
    if (!url.hostname.endsWith("spotify.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const playlistIndex = parts.findIndex((part) => part === "playlist");
    if (playlistIndex === -1) return null;
    const id = parts[playlistIndex + 1];
    return id && SPOTIFY_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function spotifyTrackUrl(trackId: string): string {
  return `https://open.spotify.com/track/${trackId}`;
}

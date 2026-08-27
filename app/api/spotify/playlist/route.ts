import { jsonWithCors, optionsWithCors } from "@/lib/cors";
import {
  parseSpotifyPlaylistId,
  spotifyTrackUrl,
} from "@/components/music-player/parse-spotify-url";

export const revalidate = 3600;

export function OPTIONS(request: Request) {
  return optionsWithCors(request);
}

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return jsonWithCors(request, { error: "Missing url" }, { status: 400 });
  }

  const playlistId = parseSpotifyPlaylistId(url);
  if (!playlistId) {
    return jsonWithCors(request, { error: "Invalid Spotify playlist URL" }, { status: 400 });
  }

  try {
    const tracks = await fetchPlaylistTrackIds(playlistId);
    if (tracks.length === 0) {
      return jsonWithCors(request, { error: "No tracks found in playlist" }, { status: 404 });
    }

    return jsonWithCors(request, {
      playlistId,
      name: "Blake's Playlist",
      tracks: tracks.map((id) => ({
        id,
        spotifyUrl: spotifyTrackUrl(id),
      })),
    });
  } catch {
    return jsonWithCors(request, { error: "Unable to load playlist" }, { status: 502 });
  }
}

async function fetchPlaylistTrackIds(playlistId: string): Promise<string[]> {
  const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
  const response = await fetch(embedUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("embed fetch failed");
  }

  const html = await response.text();
  const matches = html.matchAll(/spotify:track:([A-Za-z0-9]+)/g);
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const match of matches) {
    const id = match[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

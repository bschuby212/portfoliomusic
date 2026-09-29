import { jsonWithCors, optionsWithCors } from "@/lib/cors";
import { parseSpotifyTrackId } from "@/components/music-player/parse-spotify-url";
import type { TrackMetadata } from "@/components/music-player/types";

export const revalidate = 3600;

type SpotifyToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type SpotifyTrack = {
  name: string;
  duration_ms: number;
  preview_url?: string | null;
  artists?: { name: string }[];
  album?: { images?: { url: string }[] };
  external_urls?: { spotify?: string };
};

type DeezerSearchResult = {
  data?: {
    title?: string;
    preview?: string;
    artist?: { name?: string };
    album?: { title?: string };
  }[];
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export function OPTIONS(request: Request) {
  return optionsWithCors(request);
}

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return jsonWithCors(request, { error: "Missing url" }, { status: 400 });
  }

  const trackId = parseSpotifyTrackId(url);
  if (!trackId) {
    return jsonWithCors(request, { error: "Invalid Spotify track URL" }, { status: 400 });
  }

  const canonicalUrl = `https://open.spotify.com/track/${trackId}`;

  let metadata: TrackMetadata | null = null;

  try {
    metadata = await fetchFromWebApi(trackId, canonicalUrl);
  } catch {
    // Fall through to oEmbed.
  }

  if (!metadata) {
    try {
      const fromOEmbed = await fetchFromOEmbed(canonicalUrl);
      const artist = fromOEmbed.artist ?? (await fetchArtistFromPage(canonicalUrl));
      metadata = { ...fromOEmbed, artist };
    } catch {
      return jsonWithCors(
        request,
        { error: "Unable to load track metadata" },
        { status: 502 },
      );
    }
  }

  if (!metadata.previewUrl) {
    metadata.previewUrl = await fetchDeezerPreview(metadata.title, metadata.artist);
  }

  return jsonWithCors(request, metadata);
}

async function fetchFromWebApi(trackId: string, spotifyUrl: string): Promise<TrackMetadata | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });

  if (!response.ok) return null;

  const track = (await response.json()) as SpotifyTrack;
  return {
    title: track.name,
    artist: track.artists?.map((artist) => artist.name).join(", ") || null,
    artworkUrl: track.album?.images?.[0]?.url ?? null,
    durationMs: track.duration_ms ?? null,
    spotifyUrl: track.external_urls?.spotify ?? spotifyUrl,
    previewUrl: track.preview_url ?? null,
  };
}

async function fetchFromOEmbed(spotifyUrl: string): Promise<TrackMetadata> {
  const endpoint = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;
  const response = await fetch(endpoint, { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new Error("oEmbed failed");
  }

  const data = (await response.json()) as {
    title?: string;
    thumbnail_url?: string;
  };

  return {
    title: data.title?.trim() || "Unknown track",
    artist: null,
    artworkUrl: data.thumbnail_url ?? null,
    durationMs: null,
    spotifyUrl,
    previewUrl: null,
  };
}

async function fetchArtistFromPage(spotifyUrl: string): Promise<string | null> {
  try {
    const response = await fetch(spotifyUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const og = html.match(
      /property="og:description"\s+content="([^"]+)"|content="([^"]+)"\s+property="og:description"/i,
    );
    const description = og?.[1] ?? og?.[2];
    if (!description) return null;
    const artist = description.split("·")[0]?.trim();
    return artist || null;
  } catch {
    return null;
  }
}

async function fetchDeezerPreview(title: string, artist: string | null): Promise<string | null> {
  try {
    // Plain text search matches more reliably than quoted artist:/track: filters.
    const queries = [
      artist ? `${artist} ${title}` : title,
      title,
    ].filter((value, index, all) => value && all.indexOf(value) === index);

    for (const query of queries) {
      const endpoint = `https://api.deezer.com/search/track?q=${encodeURIComponent(query)}&limit=8`;
      const response = await fetch(endpoint, { next: { revalidate: 3600 } });
      if (!response.ok) continue;
      const data = (await response.json()) as DeezerSearchResult;
      const results = data.data ?? [];
      if (results.length === 0) continue;

      const normalizedTitle = normalize(title);
      const normalizedArtist = artist ? normalize(artist) : "";

      const exact = results.find((item) => {
        const itemTitle = normalize(item.title ?? "");
        const itemArtist = normalize(item.artist?.name ?? "");
        const titleMatch = itemTitle === normalizedTitle;
        const artistMatch =
          !normalizedArtist ||
          itemArtist.includes(normalizedArtist) ||
          normalizedArtist.includes(itemArtist);
        return titleMatch && artistMatch && item.preview;
      });

      if (exact?.preview) return exact.preview;

      const titleOnly = results.find(
        (item) => normalize(item.title ?? "") === normalizedTitle && item.preview,
      );
      if (titleOnly?.preview) return titleOnly.preview;

      if (results[0]?.preview) return results[0].preview;
    }

    return null;
  } catch {
    return null;
  }
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) return null;

  const data = (await response.json()) as SpotifyToken;
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

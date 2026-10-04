import { jsonWithCors, optionsWithCors } from "@/lib/cors";
import { parseSpotifyTrackId } from "@/components/music-player/parse-spotify-url";
import type { TrackMetadata } from "@/components/music-player/types";

/** Artwork/title can be cached; preview URLs are resolved fresh (signed CDNs expire). */
export const revalidate = 0;

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
  external_ids?: { isrc?: string };
};

type DeezerSearchResult = {
  data?: {
    title?: string;
    preview?: string;
    artist?: { name?: string };
    album?: { title?: string };
  }[];
};

type ItunesSearchResult = {
  results?: {
    trackName?: string;
    artistName?: string;
    previewUrl?: string;
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

  type ResolvedMeta = TrackMetadata & { isrc?: string | null };
  let metadata: ResolvedMeta | null = null;

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

  // oEmbed / og-tags often HTML-encode names (Her&#x27;s). Decode before search
  // or iTunes returns unrelated first hits (e.g. Mr. Blue Sky).
  metadata.title = decodeHtmlEntities(metadata.title);
  metadata.artist = metadata.artist ? decodeHtmlEntities(metadata.artist) : null;

  // Spotify often returns null preview_url. Prefer iTunes (stable CORS URLs);
  // Deezer HMAC links frequently 403 from serverless / after cache.
  if (!metadata.previewUrl || !(await isReachableAudio(metadata.previewUrl))) {
    metadata.previewUrl =
      (metadata.isrc
        ? await fetchItunesPreviewByIsrc(metadata.isrc)
        : null) ||
      (await fetchItunesPreview(metadata.title, metadata.artist)) ||
      (await fetchDeezerPreview(metadata.title, metadata.artist)) ||
      null;
  }

  const publicMetadata: TrackMetadata = {
    title: metadata.title,
    artist: metadata.artist,
    artworkUrl: metadata.artworkUrl,
    durationMs: metadata.durationMs,
    spotifyUrl: metadata.spotifyUrl,
    previewUrl: metadata.previewUrl,
  };

  return jsonWithCors(request, publicMetadata, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

async function fetchFromWebApi(
  trackId: string,
  spotifyUrl: string,
): Promise<(TrackMetadata & { isrc?: string | null }) | null> {
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
    isrc: track.external_ids?.isrc ?? null,
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
    title: decodeHtmlEntities(data.title?.trim() || "Unknown track"),
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
    const artist = decodeHtmlEntities(description.split("·")[0]?.trim() || "");
    return artist || null;
  } catch {
    return null;
  }
}

async function fetchItunesPreviewByIsrc(isrc: string): Promise<string | null> {
  try {
    const endpoint = `https://itunes.apple.com/lookup?isrc=${encodeURIComponent(isrc)}`;
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as ItunesSearchResult;
    const hit = (data.results ?? []).find((item) => item.previewUrl);
    return hit?.previewUrl ?? null;
  } catch {
    return null;
  }
}

async function fetchItunesPreview(title: string, artist: string | null): Promise<string | null> {
  try {
    const queries = [
      artist ? `${artist} ${title}` : title,
      title,
    ].filter((value, index, all) => value && all.indexOf(value) === index);

    for (const query of queries) {
      const endpoint = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=8`;
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) continue;
      const data = (await response.json()) as ItunesSearchResult;
      const results = data.results ?? [];
      if (results.length === 0) continue;

      const match = pickBestPreviewMatch(results, title, artist, (item) => ({
        title: item.trackName ?? "",
        artist: item.artistName ?? "",
        preview: item.previewUrl,
      }));
      if (match) return match;
    }

    return null;
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
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) continue;
      const data = (await response.json()) as DeezerSearchResult;
      const results = data.data ?? [];
      if (results.length === 0) continue;

      const match = pickBestPreviewMatch(results, title, artist, (item) => ({
        title: item.title ?? "",
        artist: item.artist?.name ?? "",
        preview: item.preview,
      }));
      if (match) return match;
    }

    return null;
  } catch {
    return null;
  }
}

function pickBestPreviewMatch<T>(
  results: T[],
  title: string,
  artist: string | null,
  map: (item: T) => { title: string; artist: string; preview?: string | null },
): string | null {
  const wantTitle = normalize(title);
  const wantCore = coreTitle(title);
  const wantArtist = artist ? normalize(artist) : "";
  const mapped = results
    .map(map)
    .filter((item) => item.preview)
    .map((item) => ({
      ...item,
      nTitle: normalize(item.title),
      nCore: coreTitle(item.title),
      nArtist: normalize(item.artist),
    }));

  let best: { preview: string; score: number } | null = null;

  for (const item of mapped) {
    if (!item.preview) continue;

    const titleExact =
      item.nTitle === wantTitle || item.nCore === wantCore;
    const titleClose =
      titleExact ||
      (wantCore.length >= 4 &&
        (item.nCore.includes(wantCore) || wantCore.includes(item.nCore)));
    if (!titleClose) continue;

    const artistExact = Boolean(wantArtist) && item.nArtist === wantArtist;
    const artistClose =
      !wantArtist ||
      artistExact ||
      item.nArtist.includes(wantArtist) ||
      wantArtist.includes(item.nArtist);
    if (!artistClose) continue;

    // Require a real artist signal whenever we know one — never accept a
    // title-only collision from another artist.
    if (wantArtist && !(artistExact || artistClose)) continue;

    let score = 0;
    if (titleExact) score += 4;
    else score += 2;
    if (wantArtist) {
      if (artistExact) score += 4;
      else score += 2;
    } else if (titleExact) {
      score += 1;
    }

    if (!best || score > best.score) {
      best = { preview: item.preview, score };
    }
  }

  // Need title+artist agreement (score >= 4) when artist is known.
  if (!best) return null;
  if (wantArtist && best.score < 4) return null;
  if (!wantArtist && best.score < 4) return null;
  return best.preview;
}

async function isReachableAudio(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      headers: { Range: "bytes=0-1" },
    });
    if (head.ok || head.status === 206) return true;

    // Some CDNs reject HEAD — try a tiny ranged GET.
    const get = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Range: "bytes=0-1" },
    });
    return get.ok || get.status === 206;
  } catch {
    return false;
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&(#x[0-9a-f]+|#\d+|apos|quot|amp|lt|gt);/gi, (entity) => {
      const lower = entity.toLowerCase();
      if (lower === "&amp;") return "&";
      if (lower === "&lt;") return "<";
      if (lower === "&gt;") return ">";
      if (lower === "&quot;") return '"';
      if (lower === "&apos;") return "'";
      if (lower.startsWith("&#x")) {
        const code = Number.parseInt(lower.slice(3, -1), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
      }
      if (lower.startsWith("&#")) {
        const code = Number.parseInt(lower.slice(2, -1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
      }
      return entity;
    })
    .replace(/\u00a0/g, " ")
    .trim();
}

function normalize(value: string) {
  return decodeHtmlEntities(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Strip remaster / feat / parenthetical noise for looser-but-safe title compare. */
function coreTitle(value: string) {
  return normalize(value)
    .replace(
      /\b(remaster(ed)?|remix|bonus( track)?|radio edit|feat|ft|with)\b.*$/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
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

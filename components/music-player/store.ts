"use client";

import { useSyncExternalStore } from "react";
import { getPlaybackAdapter } from "./audio-engine";
import { parseSpotifyTrackId } from "./parse-spotify-url";
import {
  EXPAND_DIRECTION,
  FILLER_TRACKS,
  PLAYLIST_NAME,
  SPOTIFY_PLAYLIST_URL,
  SURPRISE_AFTER,
  SURPRISE_TRACK,
  USE_FILLER_PLAYLIST,
} from "./playlist";
import {
  buildSurprisePlaylistOrder,
  createSequentialQueue,
  restoreSequentialQueue,
  shuffleUpcoming,
} from "./queue";
import type {
  ExpandDirection,
  PlaybackAdapter,
  PlayerPrefs,
  PlayerState,
  ResolvedTrack,
  TrackMetadata,
} from "./types";

const STORAGE_KEY = "portfolio-music-player-v2";
const RESTART_THRESHOLD = 3;

const DEFAULT_PREFS: PlayerPrefs = {
  volume: 0.35,
  muted: false,
  shuffle: true,
  repeat: false,
  expanded: false,
};

function emptyState(): PlayerState {
  return {
    tracks: [],
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: DEFAULT_PREFS.volume,
    muted: DEFAULT_PREFS.muted,
    shuffle: DEFAULT_PREFS.shuffle,
    repeat: DEFAULT_PREFS.repeat,
    expanded: DEFAULT_PREFS.expanded,
    expandDirection: EXPAND_DIRECTION,
    volumeOpen: false,
    hasAudio: false,
    playbackError: false,
    ready: false,
  };
}

function parseExpandDirection(value: string | null | undefined): ExpandDirection | null {
  if (value === "up" || value === "down") return value;
  return null;
}

function resolveExpandDirection(): ExpandDirection {
  if (typeof window !== "undefined") {
    const fromQuery = parseExpandDirection(
      new URLSearchParams(window.location.search).get("expand"),
    );
    if (fromQuery) return fromQuery;

    const fromEnv = parseExpandDirection(
      process.env.NEXT_PUBLIC_PLAYER_EXPAND_DIRECTION,
    );
    if (fromEnv) return fromEnv;
  }
  return EXPAND_DIRECTION;
}

const DEFAULT_STATE = emptyState();

let state: PlayerState = emptyState();
const listeners = new Set<() => void>();
let adapter: PlaybackAdapter | null = null;
let initialized = false;
let playlistLoading = false;
let endedLock = false;
let pendingAutoplay = false;
let previewRefreshAttempts = 0;
/** Ignore HTMLAudio pause events while swapping src (load always pauses). */
let suppressPause = false;

function playableSrc(track: ResolvedTrack | undefined): string | null {
  if (!track) return null;
  return track.audioSrc || track.metadata?.previewUrl || null;
}

function toResolvedTrack(entry: {
  spotifyUrl: string;
  audioSrc?: string;
  id?: string;
}): ResolvedTrack {
  return {
    spotifyUrl: entry.spotifyUrl,
    audioSrc: entry.audioSrc,
    id: entry.id ?? parseSpotifyTrackId(entry.spotifyUrl) ?? entry.spotifyUrl,
    metadata: null,
    metadataStatus: "idle",
  };
}

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(update: Partial<PlayerState> | ((current: PlayerState) => PlayerState)) {
  state = typeof update === "function" ? update(state) : { ...state, ...update };
  emit();
}

function persistPrefs() {
  if (typeof window === "undefined") return;
  const prefs: PlayerPrefs = {
    volume: state.volume,
    muted: state.muted,
    shuffle: state.shuffle,
    repeat: state.repeat,
    expanded: state.expanded,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore quota / private mode.
  }
}

function readPrefs(): PlayerPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<PlayerPrefs>;
    return {
      volume: clampVolume(parsed.volume ?? DEFAULT_PREFS.volume),
      muted: Boolean(parsed.muted),
      // Always start shuffled for the portfolio playlist experience unless user turned it off.
      shuffle: parsed.shuffle ?? DEFAULT_PREFS.shuffle,
      repeat: Boolean(parsed.repeat),
      expanded: Boolean(parsed.expanded),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function currentTrack(from: PlayerState = state): ResolvedTrack | undefined {
  const trackIndex = from.queue[from.queueIndex];
  if (trackIndex === undefined) return undefined;
  return from.tracks[trackIndex];
}

function loadCurrent(options: { autoplay: boolean; from: PlayerState }) {
  const track = currentTrack(options.from);
  const src = playableSrc(track);
  const hasAudio = Boolean(src);
  suppressPause = true;
  adapter?.load(src);
  window.setTimeout(() => {
    suppressPause = false;
  }, 120);
  setState({
    ...options.from,
    hasAudio,
    playbackError: false,
    currentTime: 0,
    duration: 0,
    isPlaying: options.autoplay && hasAudio ? true : false,
  });
  if (options.autoplay && hasAudio) {
    void adapter?.play().catch(() => {
      setState({ isPlaying: false });
    });
  } else {
    adapter?.pause();
    setState({ isPlaying: false });
    // No preview yet — fetch metadata, then skip if still unplayable.
    if (options.autoplay && track && track.metadataStatus !== "ready") {
      const trackIndex = options.from.queue[options.from.queueIndex];
      if (typeof trackIndex === "number") {
        void playerActions.ensureTrackMetadata(trackIndex).then(() => {
          if (playableSrc(currentTrack())) {
            loadCurrent({ autoplay: true, from: state });
            return;
          }
          playerActions.skipUnplayableForward();
        });
      }
    } else if (options.autoplay && !hasAudio) {
      playerActions.skipUnplayableForward();
    }
  }
}

function noteSuccessfulPlay() {
  previewRefreshAttempts = 0;
}

function applyQueueIndex(queueIndex: number, autoplay: boolean) {
  pendingAutoplay = autoplay;
  previewRefreshAttempts = 0;
  const next = { ...state, queueIndex };
  loadCurrent({ autoplay, from: next });
  void playerActions.ensureNearbyMetadata();
}

async function fetchTrackMetadata(
  spotifyUrl: string,
  options?: { fresh?: boolean },
): Promise<TrackMetadata> {
  const params = new URLSearchParams({ url: spotifyUrl });
  if (options?.fresh) params.set("fresh", String(Date.now()));
  const response = await fetch(`/api/spotify?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("metadata failed");
  return (await response.json()) as TrackMetadata;
}

async function fetchRemotePlaylistTracks(): Promise<ResolvedTrack[]> {
  const response = await fetch(
    `/api/spotify/playlist?url=${encodeURIComponent(SPOTIFY_PLAYLIST_URL)}`,
  );
  if (!response.ok) throw new Error("playlist failed");

  const data = (await response.json()) as {
    tracks: { id: string; spotifyUrl: string }[];
  };

  return data.tracks.map((track) =>
    toResolvedTrack({ id: track.id, spotifyUrl: track.spotifyUrl }),
  );
}

export const playerActions = {
  init() {
    if (typeof window === "undefined") return;
    if (playlistLoading) return;
    if (initialized && state.ready && state.tracks.length > 0) return;

    playlistLoading = true;

    const prefs = readPrefs();

    if (!adapter) {
      adapter = getPlaybackAdapter({
        onTimeUpdate(currentTime) {
          if (!state.isPlaying) return;
          setState({ currentTime });
        },
        onDurationChange(duration) {
          setState({ duration });
        },
        onPlay() {
          noteSuccessfulPlay();
          setState({ isPlaying: true, playbackError: false });
        },
        onPause() {
          if (suppressPause || pendingAutoplay) return;
          setState({ isPlaying: false });
        },
        onEnded() {
          if (endedLock) return;
          endedLock = true;
          playerActions.handleEnded();
          window.setTimeout(() => {
            endedLock = false;
          }, 50);
        },
        onError() {
          setState({ isPlaying: false, playbackError: true, duration: 0 });
          if (previewRefreshAttempts < 1) {
            previewRefreshAttempts += 1;
            void playerActions.refreshCurrentPreview();
          }
        },
        onVolumeChange(volume, muted) {
          setState({ volume, muted });
          persistPrefs();
        },
      });
    }

    adapter.setVolume(prefs.volume);
    adapter.setMuted(prefs.muted);

    setState({
      ...emptyState(),
      volume: prefs.volume,
      muted: prefs.muted,
      shuffle: true,
      repeat: prefs.repeat,
      expanded: prefs.expanded,
      expandDirection: resolveExpandDirection(),
      ready: false,
    });

    void playerActions.loadPlaylist().finally(() => {
      playlistLoading = false;
    });
    void playerActions.syncExpandDirectionFromBackend();
  },

  async syncExpandDirectionFromBackend() {
    try {
      const response = await fetch("/api/player/config");
      if (!response.ok) return;
      const data = (await response.json()) as { expandDirection?: string };
      const direction = parseExpandDirection(data.expandDirection);
      if (!direction) return;
      // Query param wins for local demos; otherwise backend/env wins.
      if (typeof window !== "undefined") {
        const fromQuery = parseExpandDirection(
          new URLSearchParams(window.location.search).get("expand"),
        );
        if (fromQuery) return;
      }
      setState({ expandDirection: direction });
    } catch {
      // Keep resolved local/default direction.
    }
  },

  setExpandDirection(expandDirection: ExpandDirection) {
    setState({ expandDirection });
  },

  async loadPlaylist() {
    try {
      const playlistTracks = USE_FILLER_PLAYLIST
        ? FILLER_TRACKS.map((entry) => toResolvedTrack(entry))
        : await fetchRemotePlaylistTracks();

      const surprise = toResolvedTrack(SURPRISE_TRACK);
      const ordered = buildSurprisePlaylistOrder(
        playlistTracks,
        surprise,
        SURPRISE_AFTER,
      );

      const prefs = readPrefs();
      const next: PlayerState = {
        ...state,
        tracks: ordered,
        queue: createSequentialQueue(ordered.length),
        queueIndex: 0,
        shuffle: true,
        repeat: prefs.repeat,
        expanded: prefs.expanded,
        volume: prefs.volume,
        muted: prefs.muted,
        ready: true,
        hasAudio: Boolean(playableSrc(ordered[0])),
      };

      initialized = true;
      state = next;
      emit();
      loadCurrent({ autoplay: false, from: state });
      // Don't block ready on metadata — load artwork/preview in the background.
      void playerActions.ensureNearbyMetadata();
    } catch {
      initialized = true;
      const fallbackTracks = FILLER_TRACKS.length
        ? FILLER_TRACKS.map((entry) => toResolvedTrack(entry))
        : [toResolvedTrack(SURPRISE_TRACK)];
      const surprise = toResolvedTrack(SURPRISE_TRACK);
      const ordered = buildSurprisePlaylistOrder(
        fallbackTracks,
        surprise,
        Math.min(SURPRISE_AFTER, fallbackTracks.length),
      );
      setState({
        ready: true,
        tracks: ordered,
        queue: createSequentialQueue(ordered.length),
        queueIndex: 0,
        hasAudio: Boolean(playableSrc(ordered[0])),
      });
      loadCurrent({ autoplay: false, from: state });
      void playerActions.ensureNearbyMetadata();
    }
  },

  async ensureNearbyMetadata() {
    const indexes = [state.queueIndex, state.queueIndex + 1]
      .map((queuePos) => state.queue[queuePos])
      .filter((value): value is number => typeof value === "number");

    await Promise.all(indexes.map((trackIndex) => playerActions.ensureTrackMetadata(trackIndex)));
  },

  async ensureTrackMetadata(trackIndex: number, options?: { fresh?: boolean }) {
    const track = state.tracks[trackIndex];
    if (!track) return;
    if (
      !options?.fresh &&
      (track.metadataStatus === "ready" || track.metadataStatus === "loading")
    ) {
      return;
    }

    setState((current) => {
      const tracks = current.tracks.slice();
      const existing = tracks[trackIndex];
      if (!existing) return current;
      tracks[trackIndex] = { ...existing, metadataStatus: "loading" };
      return { ...current, tracks };
    });

    try {
      const metadata = await fetchTrackMetadata(track.spotifyUrl, options);
      let shouldReload = false;

      setState((current) => {
        const tracks = current.tracks.slice();
        const existing = tracks[trackIndex];
        if (!existing) return current;
        const updated: ResolvedTrack = {
          ...existing,
          metadata,
          metadataStatus: "ready",
        };
        tracks[trackIndex] = updated;

        const currentIndex = current.queue[current.queueIndex];
        const isCurrent = currentIndex === trackIndex;
        const src = playableSrc(updated);
        const previousSrc = playableSrc(existing);
        if (isCurrent && src && (options?.fresh || src !== previousSrc || !previousSrc)) {
          shouldReload = true;
        }

        return {
          ...current,
          tracks,
          hasAudio: isCurrent ? Boolean(src) : current.hasAudio,
          playbackError: isCurrent && !src ? true : current.playbackError,
        };
      });

      if (shouldReload) {
        const shouldPlay = pendingAutoplay || state.isPlaying;
        pendingAutoplay = false;
        loadCurrent({ autoplay: shouldPlay, from: state });
      } else {
        const currentIndex = state.queue[state.queueIndex];
        const isCurrent = currentIndex === trackIndex;
        if (
          isCurrent &&
          !playableSrc(state.tracks[trackIndex]) &&
          (pendingAutoplay || state.isPlaying)
        ) {
          pendingAutoplay = false;
          playerActions.skipUnplayableForward();
        }
      }
    } catch {
      setState((current) => {
        const tracks = current.tracks.slice();
        const existing = tracks[trackIndex];
        if (!existing) return current;
        tracks[trackIndex] = { ...existing, metadataStatus: "error" };
        return { ...current, tracks };
      });
      const currentIndex = state.queue[state.queueIndex];
      if (
        currentIndex === trackIndex &&
        (pendingAutoplay || state.isPlaying)
      ) {
        pendingAutoplay = false;
        playerActions.skipUnplayableForward();
      }
    }
  },

  /** Re-resolve a dead/expired preview URL once, then resume if we were trying to play. */
  async refreshCurrentPreview() {
    const trackIndex = state.queue[state.queueIndex];
    if (typeof trackIndex !== "number") return;
    const track = state.tracks[trackIndex];
    if (!track || track.audioSrc) return;

    const shouldPlay = pendingAutoplay || state.isPlaying || state.playbackError;
    pendingAutoplay = shouldPlay;
    await playerActions.ensureTrackMetadata(trackIndex, { fresh: true });
  },

  togglePlay() {
    const track = currentTrack();
    if (!adapter) return;

    if (state.isPlaying) {
      adapter.pause();
      setState({ isPlaying: false });
      return;
    }

    // Optimistic UI so pause icon + disc spin flip immediately on click.
    setState({ isPlaying: true, playbackError: false });

    const src = playableSrc(track);
    if (!src) {
      void (async () => {
        const trackIndex = state.queue[state.queueIndex];
        if (typeof trackIndex !== "number") return;
        pendingAutoplay = true;
        await playerActions.ensureTrackMetadata(trackIndex, { fresh: true });
        if (!playableSrc(currentTrack())) {
          pendingAutoplay = false;
          setState({ isPlaying: false, playbackError: true });
          return;
        }
        loadCurrent({ autoplay: true, from: state });
      })();
      return;
    }

    // Reload when prior play failed or the element never got a duration.
    if (state.playbackError || adapter.getDuration() === 0) {
      adapter.load(src);
    }

    void adapter.play().catch(() => {
      setState({ isPlaying: false, playbackError: true });
      void playerActions.refreshCurrentPreview();
    });
  },

  next(fromEnded = false) {
    if (fromEnded && state.repeat) {
      adapter?.seek(0);
      void adapter?.play().catch(() => setState({ isPlaying: false }));
      setState({ currentTime: 0 });
      return;
    }

    const nextIndex = state.queueIndex + 1;
    // Always wrap the playlist so collapsed preview keeps looping.
    if (nextIndex >= state.queue.length) {
      applyQueueIndex(0, true);
      return;
    }

    applyQueueIndex(nextIndex, true);
  },

  /** Advance past tracks with no preview / audioSrc (wraps once through the queue). */
  skipUnplayableForward() {
    const len = state.queue.length;
    if (len <= 1) return;
    const start = state.queueIndex;
    for (let step = 1; step < len; step += 1) {
      const qi = (start + step) % len;
      const track = state.tracks[state.queue[qi] ?? -1];
      if (playableSrc(track)) {
        applyQueueIndex(qi, true);
        return;
      }
      // Still loading metadata — jump there and let loadCurrent finish the resolve.
      if (track && track.metadataStatus !== "ready" && track.metadataStatus !== "error") {
        applyQueueIndex(qi, true);
        return;
      }
    }
  },

  previous() {
    if (state.currentTime > RESTART_THRESHOLD) {
      adapter?.seek(0);
      setState({ currentTime: 0 });
      return;
    }

    const previousIndex = state.queueIndex - 1;
    if (previousIndex < 0) {
      applyQueueIndex(Math.max(state.queue.length - 1, 0), true);
      return;
    }
    applyQueueIndex(previousIndex, true);
  },

  handleEnded() {
    playerActions.next(true);
  },

  seek(time: number) {
    if (!state.hasAudio || !adapter) return;
    adapter.seek(time);
    setState({ currentTime: time });
  },

  setVolume(volume: number) {
    const nextVolume = clampVolume(volume);
    adapter?.setVolume(nextVolume);
    if (nextVolume > 0 && state.muted) {
      adapter?.setMuted(false);
      setState({ volume: nextVolume, muted: false });
    } else {
      setState({ volume: nextVolume });
    }
    persistPrefs();
  },

  toggleMuted() {
    const muted = !state.muted;
    adapter?.setMuted(muted);
    setState({ muted });
    persistPrefs();
  },

  toggleShuffle() {
    const shuffle = !state.shuffle;
    const currentIndex = state.queue[state.queueIndex] ?? 0;
    if (shuffle) {
      const sequential = createSequentialQueue(state.tracks.length);
      const currentQueueIndex = sequential.indexOf(currentIndex);
      setState({
        shuffle: true,
        queue: shuffleUpcoming(sequential, Math.max(currentQueueIndex, 0)),
        queueIndex: Math.max(currentQueueIndex, 0),
      });
    } else {
      const restored = restoreSequentialQueue(state.tracks.length, currentIndex);
      setState({
        shuffle: false,
        queue: restored.queue,
        queueIndex: restored.queueIndex,
      });
    }
    persistPrefs();
  },

  toggleRepeat() {
    setState({ repeat: !state.repeat });
    persistPrefs();
  },

  setExpanded(expanded: boolean) {
    // Keep playback across expand/collapse — custom panel is the same player.
    setState({ expanded, volumeOpen: expanded ? state.volumeOpen : false });
    persistPrefs();
  },

  toggleExpanded() {
    playerActions.setExpanded(!state.expanded);
  },

  toggleVolumeOpen() {
    setState({ volumeOpen: !state.volumeOpen });
  },
};

export function subscribePlayer(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPlayerSnapshot() {
  return state;
}

export function getPlayerServerSnapshot() {
  return DEFAULT_STATE;
}

export function usePlayerStore() {
  return useSyncExternalStore(subscribePlayer, getPlayerSnapshot, getPlayerServerSnapshot);
}

export function getPlaylistDisplayName() {
  return PLAYLIST_NAME;
}

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_PREFS.volume;
  return Math.min(1, Math.max(0, value));
}

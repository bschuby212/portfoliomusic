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

const STORAGE_KEY = "portfolio-music-player";
const RESTART_THRESHOLD = 3;

const DEFAULT_PREFS: PlayerPrefs = {
  volume: 0.8,
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
  adapter?.load(src);
  setState({
    ...options.from,
    hasAudio,
    playbackError: false,
    currentTime: 0,
    duration: 0,
  });
  if (options.autoplay && hasAudio) {
    void adapter?.play().catch(() => {
      setState({ isPlaying: false });
    });
  } else {
    adapter?.pause();
    setState({ isPlaying: false });
  }
}

function applyQueueIndex(queueIndex: number, autoplay: boolean) {
  pendingAutoplay = autoplay;
  const next = { ...state, queueIndex };
  loadCurrent({ autoplay, from: next });
  void playerActions.ensureNearbyMetadata();
}

async function fetchTrackMetadata(spotifyUrl: string): Promise<TrackMetadata> {
  const response = await fetch(`/api/spotify?url=${encodeURIComponent(spotifyUrl)}`);
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
          setState({ isPlaying: true, playbackError: false });
        },
        onPause() {
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

  async ensureTrackMetadata(trackIndex: number) {
    const track = state.tracks[trackIndex];
    if (!track) return;
    if (track.metadataStatus === "ready" || track.metadataStatus === "loading") return;

    setState((current) => {
      const tracks = current.tracks.slice();
      const existing = tracks[trackIndex];
      if (!existing) return current;
      tracks[trackIndex] = { ...existing, metadataStatus: "loading" };
      return { ...current, tracks };
    });

    try {
      const metadata = await fetchTrackMetadata(track.spotifyUrl);
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
        if (isCurrent && src && !playableSrc(existing)) {
          shouldReload = true;
        }

        return {
          ...current,
          tracks,
          hasAudio: isCurrent ? Boolean(src) : current.hasAudio,
        };
      });

      if (shouldReload) {
        const shouldPlay = pendingAutoplay || state.isPlaying;
        pendingAutoplay = false;
        loadCurrent({ autoplay: shouldPlay, from: state });
      }
    } catch {
      setState((current) => {
        const tracks = current.tracks.slice();
        const existing = tracks[trackIndex];
        if (!existing) return current;
        tracks[trackIndex] = { ...existing, metadataStatus: "error" };
        return { ...current, tracks };
      });
    }
  },

  togglePlay() {
    const track = currentTrack();
    if (!adapter) return;

    const src = playableSrc(track);
    if (!src) {
      void (async () => {
        const trackIndex = state.queue[state.queueIndex];
        if (typeof trackIndex !== "number") return;
        await playerActions.ensureTrackMetadata(trackIndex);
        const readySrc = playableSrc(currentTrack());
        if (!readySrc || !adapter) return;
        void adapter.play().catch(() => {
          setState({ isPlaying: false, playbackError: true });
        });
      })();
      return;
    }

    if (state.isPlaying) {
      adapter.pause();
      return;
    }
    void adapter.play().catch(() => {
      setState({ isPlaying: false, playbackError: true });
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
    if (nextIndex >= state.queue.length) {
      if (fromEnded) {
        adapter?.pause();
        adapter?.seek(0);
        setState({ isPlaying: false, currentTime: 0 });
        return;
      }
      applyQueueIndex(0, true);
      return;
    }

    applyQueueIndex(nextIndex, true);
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

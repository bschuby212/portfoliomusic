export type PlaylistEntry = {
  spotifyUrl: string;
  audioSrc?: string;
};

export type TrackMetadata = {
  title: string;
  artist: string | null;
  artworkUrl: string | null;
  durationMs: number | null;
  spotifyUrl: string;
  /** 30s preview URL when full Spotify streaming is unavailable */
  previewUrl: string | null;
};

export type MetadataStatus = "idle" | "loading" | "ready" | "error";

export type ResolvedTrack = PlaylistEntry & {
  id: string;
  metadata: TrackMetadata | null;
  metadataStatus: MetadataStatus;
};

export type PlaybackKind = "html-audio" | "spotify-sdk";

export type PlaybackListeners = {
  onTimeUpdate: (currentTime: number) => void;
  onDurationChange: (duration: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
  onError: () => void;
  onVolumeChange: (volume: number, muted: boolean) => void;
};

export interface PlaybackAdapter {
  readonly kind: PlaybackKind;
  readonly supported: boolean;
  load(src: string | null): void;
  play(): Promise<void>;
  pause(): void;
  seek(time: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

export type PlayerPrefs = {
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: boolean;
  expanded: boolean;
};

export type PlayerState = {
  tracks: ResolvedTrack[];
  queue: number[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: boolean;
  expanded: boolean;
  volumeOpen: boolean;
  hasAudio: boolean;
  playbackError: boolean;
  ready: boolean;
};

import type { PlaybackAdapter, PlaybackListeners } from "../types";

/**
 * Placeholder for Spotify Web Playback SDK integration.
 * Full Spotify playback requires visitor OAuth, Premium, and the SDK —
 * it is intentionally not faked here. Swap this in once those pieces exist.
 */
export class SpotifySdkAdapter implements PlaybackAdapter {
  readonly kind = "spotify-sdk" as const;
  readonly supported = false;

  constructor(listeners: PlaybackListeners) {
    void listeners;
  }

  load() {
    unsupported();
  }

  play() {
    unsupported();
    return Promise.reject(new Error(SDK_MESSAGE));
  }

  pause() {
    unsupported();
  }

  seek() {
    unsupported();
  }

  setVolume() {
    unsupported();
  }

  setMuted() {
    unsupported();
  }

  getCurrentTime() {
    return 0;
  }

  getDuration() {
    return 0;
  }

  destroy() {}
}

const SDK_MESSAGE =
  "Spotify Web Playback SDK is not connected. Provide audioSrc for HTML audio playback, or wire this adapter later.";

function unsupported(): never {
  throw new Error(SDK_MESSAGE);
}

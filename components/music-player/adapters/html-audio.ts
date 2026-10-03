import type { PlaybackAdapter, PlaybackListeners } from "../types";

export class HtmlAudioAdapter implements PlaybackAdapter {
  readonly kind = "html-audio" as const;
  readonly supported = true;

  private readonly audio: HTMLAudioElement;

  constructor(listeners: PlaybackListeners) {
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.addEventListener("timeupdate", () => {
      listeners.onTimeUpdate(this.audio.currentTime);
    });
    this.audio.addEventListener("durationchange", () => {
      listeners.onDurationChange(finiteDuration(this.audio.duration));
    });
    this.audio.addEventListener("loadedmetadata", () => {
      listeners.onDurationChange(finiteDuration(this.audio.duration));
    });
    this.audio.addEventListener("play", () => listeners.onPlay());
    this.audio.addEventListener("pause", () => listeners.onPause());
    this.audio.addEventListener("ended", () => listeners.onEnded());
    this.audio.addEventListener("error", () => listeners.onError());
    this.audio.addEventListener("volumechange", () => {
      listeners.onVolumeChange(this.audio.volume, this.audio.muted);
    });
  }

  load(src: string | null) {
    if (!src) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      return;
    }

    this.audio.src = src;
    this.audio.load();
  }

  play() {
    return this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  seek(time: number) {
    if (!Number.isFinite(time)) return;
    this.audio.currentTime = Math.max(0, time);
  }

  setVolume(volume: number) {
    this.audio.volume = Math.min(1, Math.max(0, volume));
  }

  setMuted(muted: boolean) {
    this.audio.muted = muted;
  }

  getCurrentTime() {
    return this.audio.currentTime || 0;
  }

  getDuration() {
    return finiteDuration(this.audio.duration);
  }

  destroy() {
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
  }
}

function finiteDuration(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

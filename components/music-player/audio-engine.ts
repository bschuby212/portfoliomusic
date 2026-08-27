import { HtmlAudioAdapter } from "./adapters/html-audio";
import type { PlaybackAdapter, PlaybackListeners } from "./types";

let adapter: PlaybackAdapter | null = null;

export function getPlaybackAdapter(listeners: PlaybackListeners): PlaybackAdapter {
  if (!adapter) {
    adapter = new HtmlAudioAdapter(listeners);
  }
  return adapter;
}

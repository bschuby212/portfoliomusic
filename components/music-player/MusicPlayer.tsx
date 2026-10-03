"use client";

import { ChevronDown, ChevronUp, Music2, Pause, Play } from "lucide-react";
import { useEffect } from "react";
import "./music-player.css";
import { SPOTIFY_PLAYLIST_URL } from "./playlist";
import { playerActions, usePlayerStore } from "./store";

type MusicPlayerProps = {
  /** Sit inside the pill nav instead of the fixed corner. */
  embedded?: boolean;
};

const ICON_STROKE = 1.75;

const SPOTIFY_EMBED_SRC =
  "https://open.spotify.com/embed/playlist/" +
  (SPOTIFY_PLAYLIST_URL.split("/playlist/")[1]?.split("?")[0] ??
    "5zXp8gIyEeJteiSZj1RTqJ") +
  "?utm_source=generator";

export function MusicPlayer({ embedded = false }: MusicPlayerProps) {
  const state = usePlayerStore();
  const trackIndex = state.queue[state.queueIndex] ?? 0;
  const track = state.tracks[trackIndex];
  const expandDown = embedded || state.expandDirection === "down";

  useEffect(() => {
    playerActions.init();
  }, []);

  useEffect(() => {
    if (embedded) {
      playerActions.setExpandDirection("down");
    }
  }, [embedded]);

  useEffect(() => {
    if (state.ready && state.tracks.length > 0) return;
    const timer = window.setTimeout(() => {
      playerActions.init();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state.ready, state.tracks.length]);

  return (
    <aside
      className="mp"
      data-embedded={embedded ? "true" : "false"}
      data-expanded={state.expanded}
      data-expand={embedded ? "down" : state.expandDirection}
      data-playing={state.isPlaying}
      data-volume-open={state.volumeOpen}
      aria-label="Music player"
    >
      <div
        className="mp-collapsed"
        onClick={() => playerActions.setExpanded(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            playerActions.setExpanded(true);
          }
        }}
        role="button"
        tabIndex={state.expanded ? -1 : 0}
        aria-expanded={state.expanded}
        aria-label="Expand music player"
      >
        <span className="mp-icon-btn" aria-hidden="true">
          <Music2 size={15} strokeWidth={ICON_STROKE} />
        </span>
        <span className="mp-disc" aria-hidden="true">
          {track?.metadata?.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.metadata.artworkUrl} alt="" />
          ) : (
            <span className="mp-disc-fallback">
              <Music2 size={11} strokeWidth={ICON_STROKE} />
            </span>
          )}
        </span>
        <button
          type="button"
          className="mp-icon-btn mp-collapsed-play"
          aria-label={state.isPlaying ? "Pause" : "Play"}
          disabled={!state.ready}
          onClick={(event) => {
            event.stopPropagation();
            playerActions.togglePlay();
          }}
        >
          {state.isPlaying ? (
            <Pause size={14} strokeWidth={2.2} fill="currentColor" />
          ) : (
            <Play size={14} strokeWidth={2.2} fill="currentColor" />
          )}
        </button>
        <button
          type="button"
          className="mp-icon-btn mp-collapsed-chevron"
          aria-label="Expand music player"
          onClick={(event) => {
            event.stopPropagation();
            playerActions.setExpanded(true);
          }}
        >
          {expandDown ? (
            <ChevronDown size={15} strokeWidth={ICON_STROKE} />
          ) : (
            <ChevronUp size={15} strokeWidth={ICON_STROKE} />
          )}
        </button>
      </div>

      <div className="mp-expanded">
        <div className="mp-expanded-inner mp-expanded-embed">
          <div className="mp-embed-bar">
            <button
              type="button"
              className="mp-icon-btn mp-collapse"
              aria-label="Collapse music player"
              onClick={() => playerActions.setExpanded(false)}
            >
              {expandDown ? (
                <ChevronUp size={16} strokeWidth={ICON_STROKE} />
              ) : (
                <ChevronDown size={16} strokeWidth={ICON_STROKE} />
              )}
            </button>
          </div>
          <div className="mp-embed-frame">
            <iframe
              title="Spotify playlist"
              src={SPOTIFY_EMBED_SRC}
              width="100%"
              height={352}
              frameBorder={0}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

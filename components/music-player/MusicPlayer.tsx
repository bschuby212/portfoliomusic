"use client";

import {
  ChevronDown,
  ChevronUp,
  Music2,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { formatTime } from "./format-time";
import "./music-player.css";
import { playerActions, usePlayerStore } from "./store";
import type { ResolvedTrack } from "./types";

const ICON_STROKE = 1.75;

type MusicPlayerProps = {
  /** Sit inside the pill nav instead of the fixed corner. */
  embedded?: boolean;
};

export function MusicPlayer({ embedded = false }: MusicPlayerProps) {
  const state = usePlayerStore();
  const trackIndex = state.queue[state.queueIndex] ?? 0;
  const track = state.tracks[trackIndex];
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

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

  const displayTime = scrubbing ? scrubTime : state.currentTime;
  // Previews are ~30s; use that until the audio element reports a real duration.
  const progressMax =
    state.duration > 0 ? state.duration : state.hasAudio ? 30 : 0;
  const progressValue = progressMax > 0 ? Math.min(displayTime, progressMax) : 0;
  const title = trackTitle(track);
  const artist = trackArtist(track);
  const VolumeIcon = state.muted || state.volume === 0 ? VolumeX : state.volume < 0.4 ? Volume1 : Volume2;

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
          <Music2 size={15} strokeWidth={2} />
        </span>
        {/* Shell keeps the ring circular while the inner disc spins. */}
        <span className="mp-disc-shell" aria-hidden="true">
          <span className="mp-disc">
            {track?.metadata?.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={track.metadata.artworkUrl} alt="" />
            ) : (
              <span className="mp-disc-fallback">
                <Music2 size={11} strokeWidth={2} />
              </span>
            )}
          </span>
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
            <PauseIcon size={12} />
          ) : (
            <Play size={13} strokeWidth={0} fill="currentColor" absoluteStrokeWidth />
          )}
        </button>
        {state.isPlaying ? (
          <button
            type="button"
            className="mp-icon-btn mp-collapsed-shuffle"
            aria-label="Reshuffle playlist"
            title="Reshuffle"
            onClick={(event) => {
              event.stopPropagation();
              playerActions.toggleShuffle();
            }}
          >
            <Shuffle size={12} strokeWidth={2.5} absoluteStrokeWidth />
          </button>
        ) : null}
      </div>

      <div className="mp-expanded">
        <div
          className={
            embedded ? "mp-expanded-inner mp-expanded-embed" : "mp-expanded-inner"
          }
          onClick={
            embedded ? () => playerActions.setExpanded(false) : undefined
          }
          onKeyDown={
            embedded
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    playerActions.setExpanded(false);
                  }
                }
              : undefined
          }
          role={embedded ? "button" : undefined}
          tabIndex={embedded ? 0 : undefined}
          aria-label={embedded ? "Collapse music player" : undefined}
        >
          <div className="mp-top">
            <div className="mp-art" key={track?.id}>
              {track?.metadata?.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="mp-crossfade"
                  src={track.metadata.artworkUrl}
                  alt=""
                />
              ) : (
                <div className="mp-art-fallback">
                  <Music2 size={embedded ? 12 : 18} strokeWidth={1.75} />
                </div>
              )}
            </div>
            <div className="mp-meta" key={`${track?.id}-meta`}>
              <span className="mp-title mp-crossfade">{title}</span>
              <span className="mp-artist mp-crossfade">{artist}</span>
            </div>
            {!embedded ? (
              <button
                type="button"
                className="mp-icon-btn mp-collapse"
                aria-label="Collapse music player"
                onClick={() => playerActions.setExpanded(false)}
              >
                {state.expandDirection === "down" ? (
                  <ChevronUp size={16} strokeWidth={2} />
                ) : (
                  <ChevronDown size={16} strokeWidth={2} />
                )}
              </button>
            ) : null}
          </div>

          <div className="mp-transport">
            <button
              type="button"
              className="mp-ctrl mp-ctrl-shuffle"
              aria-label="Reshuffle playlist"
              title="Reshuffle"
              onClick={(event) => {
                event.stopPropagation();
                playerActions.toggleShuffle();
              }}
            >
              <Shuffle size={embedded ? 16 : 15} strokeWidth={2} />
            </button>
            {!embedded ? (
              <button
                type="button"
                className="mp-ctrl mp-ctrl-prev"
                aria-label="Previous track"
                onClick={(event) => {
                  event.stopPropagation();
                  playerActions.previous();
                }}
              >
                <SkipBack size={16} strokeWidth={2} fill="currentColor" />
              </button>
            ) : null}
            <button
              type="button"
              className="mp-ctrl mp-ctrl-play"
              aria-label={state.isPlaying ? "Pause" : "Play"}
              disabled={!state.ready}
              onClick={(event) => {
                event.stopPropagation();
                playerActions.togglePlay();
              }}
            >
              {state.isPlaying ? (
                <PauseIcon size={embedded ? 16 : 15} />
              ) : (
                <Play
                  size={embedded ? 16 : 15}
                  strokeWidth={0}
                  fill="currentColor"
                  absoluteStrokeWidth
                />
              )}
            </button>
            {!embedded ? (
              <>
                <button
                  type="button"
                  className="mp-ctrl mp-ctrl-next"
                  aria-label="Next track"
                  onClick={() => playerActions.next()}
                >
                  <SkipForward size={16} strokeWidth={2} fill="currentColor" />
                </button>
                <button
                  type="button"
                  className="mp-ctrl mp-ctrl-repeat"
                  aria-label="Repeat track"
                  aria-pressed={state.repeat}
                  data-active={state.repeat}
                  onClick={playerActions.toggleRepeat}
                >
                  <Repeat size={15} strokeWidth={2} />
                </button>
              </>
            ) : null}
          </div>

          {!embedded ? (
            <div className="mp-progress">
              <span className="mp-time">{formatTime(displayTime)}</span>
              <input
                className="mp-range"
                type="range"
                min={0}
                max={progressMax || 0}
                step={0.01}
                value={progressValue}
                disabled={!state.hasAudio}
                aria-label="Track progress"
                style={rangeFill(progressMax > 0 ? progressValue / progressMax : 0)}
                onPointerDown={() => {
                  setScrubbing(true);
                  setScrubTime(state.currentTime);
                }}
                onChange={(event) => {
                  const next = Number(event.currentTarget.value);
                  setScrubTime(next);
                  if (!scrubbing) playerActions.seek(next);
                }}
                onPointerUp={(event) => {
                  playerActions.seek(Number(event.currentTarget.value));
                  setScrubbing(false);
                }}
                onPointerCancel={() => setScrubbing(false)}
              />
              <span className="mp-time">{formatTime(progressMax)}</span>
            </div>
          ) : null}

          {!embedded ? (
            <div className="mp-footer">
              <div className="mp-volume">
                <button
                  type="button"
                  className="mp-icon-btn"
                  aria-label={state.muted ? "Unmute" : "Mute"}
                  onClick={() => {
                    if (window.matchMedia("(max-width: 640px)").matches) {
                      playerActions.toggleVolumeOpen();
                      return;
                    }
                    playerActions.toggleMuted();
                  }}
                >
                  <VolumeIcon size={15} strokeWidth={2} />
                </button>
                <div className="mp-volume-slider">
                  <input
                    className="mp-range"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={state.muted ? 0 : state.volume}
                    aria-label="Volume"
                    onChange={(event) => playerActions.setVolume(Number(event.currentTarget.value))}
                    style={rangeFill(state.muted ? 0 : state.volume)}
                  />
                </div>
              </div>
              <span className="mp-note">
                {state.hasAudio
                  ? track?.audioSrc
                    ? "Track preview"
                    : "30s preview"
                  : "No audio source"}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

/** Crisp filled pause bars — avoid Lucide stroke+fill mush under glass blur. */
function PauseIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      style={{ display: "block", transform: "translateZ(0)" }}
    >
      <rect x="6.5" y="4.5" width="4" height="15" rx="0.75" />
      <rect x="13.5" y="4.5" width="4" height="15" rx="0.75" />
    </svg>
  );
}

function rangeFill(percent: number): CSSProperties {
  const clamped = Math.min(1, Math.max(0, percent)) * 100;
  return {
    background: `linear-gradient(to right, #111 ${clamped}%, rgba(17, 17, 17, 0.08) ${clamped}%)`,
  };
}

function trackTitle(track: ResolvedTrack | undefined) {
  if (!track) return "Loading playlist";
  if (track.metadata?.title) return track.metadata.title;
  if (track.metadataStatus === "loading" || track.metadataStatus === "idle") {
    return "Loading track";
  }
  if (track.metadataStatus === "error") return "Track unavailable";
  return "Untitled track";
}

function trackArtist(track: ResolvedTrack | undefined) {
  if (!track) return "";
  if (track.metadata?.artist) return track.metadata.artist;
  if (track.metadataStatus === "loading") return "Fetching details";
  if (track.metadataStatus === "error") return "Metadata unavailable";
  if (track.metadata && !track.audioSrc && !track.metadata.previewUrl) {
    return "Playback not available";
  }
  return "";
}

export function createSequentialQueue(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}

export function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const left = next[i];
    const right = next[j];
    if (left === undefined || right === undefined) continue;
    next[i] = right;
    next[j] = left;
  }
  return next;
}

export function shuffleUpcoming(queue: number[], queueIndex: number): number[] {
  const current = queue[queueIndex];
  if (current === undefined) return [...queue];

  const upcoming = queue.slice(queueIndex + 1);
  for (let i = upcoming.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const left = upcoming[i];
    const right = upcoming[j];
    if (left === undefined || right === undefined) continue;
    upcoming[i] = right;
    upcoming[j] = left;
  }

  return [...queue.slice(0, queueIndex), current, ...upcoming];
}

export function restoreSequentialQueue(
  length: number,
  currentTrackIndex: number,
): { queue: number[]; queueIndex: number } {
  const safeIndex = Math.min(Math.max(currentTrackIndex, 0), Math.max(length - 1, 0));
  return {
    queue: createSequentialQueue(length),
    queueIndex: length === 0 ? 0 : safeIndex,
  };
}

/**
 * Playback queue over tracks laid out as `[...playlist, surprise?]`.
 * Optionally shuffles playlist indices, then pins the surprise after `surpriseAfter` songs.
 */
export function buildPlaybackQueue(
  playlistLength: number,
  options: {
    shuffle: boolean;
    surpriseAfter: number;
    includeSurprise: boolean;
  },
): number[] {
  const playlistIndices = createSequentialQueue(playlistLength);
  const ordered = options.shuffle ? shuffleArray(playlistIndices) : playlistIndices;
  if (!options.includeSurprise) return ordered;

  const surpriseIndex = playlistLength;
  const after = Math.min(Math.max(options.surpriseAfter, 0), ordered.length);
  return [...ordered.slice(0, after), surpriseIndex, ...ordered.slice(after)];
}

/** Keep the current track, reshuffle every other track after it. */
export function reshuffleFromCurrent(
  trackCount: number,
  currentTrackIndex: number,
): { queue: number[]; queueIndex: number } {
  if (trackCount <= 0) return { queue: [], queueIndex: 0 };
  const current = Math.min(Math.max(currentTrackIndex, 0), trackCount - 1);
  const rest = createSequentialQueue(trackCount).filter((index) => index !== current);
  return {
    queue: [current, ...shuffleArray(rest)],
    queueIndex: 0,
  };
}

/** @deprecated Prefer buildPlaybackQueue — kept for tests/legacy call sites. */
export function buildSurprisePlaylistOrder<T>(
  items: T[],
  surprise: T,
  afterCount: number,
): T[] {
  const shuffled = shuffleArray(items);
  if (shuffled.length === 0) return [surprise];
  const head = shuffled.slice(0, afterCount);
  const tail = shuffled.slice(afterCount);
  return [...head, surprise, ...tail];
}

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

/** Shuffle playlist tracks, then insert surprise track after `afterCount` songs. */
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

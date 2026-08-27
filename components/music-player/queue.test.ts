import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSurprisePlaylistOrder,
  createSequentialQueue,
  restoreSequentialQueue,
  shuffleUpcoming,
} from "./queue.ts";

test("creates a sequential queue", () => {
  assert.deepEqual(createSequentialQueue(3), [0, 1, 2]);
});

test("shuffles only upcoming tracks", () => {
  const original = [0, 1, 2, 3, 4];
  const shuffled = shuffleUpcoming(original, 1);
  assert.equal(shuffled[0], 0);
  assert.equal(shuffled[1], 1);
  assert.equal(shuffled.length, 5);
  assert.deepEqual([...shuffled].sort(), original);
});

test("restores sequential order around the current track", () => {
  const restored = restoreSequentialQueue(4, 2);
  assert.deepEqual(restored, { queue: [0, 1, 2, 3], queueIndex: 2 });
});

test("inserts surprise after four songs", () => {
  const items = ["a", "b", "c", "d", "e", "f"];
  const ordered = buildSurprisePlaylistOrder(items, "rickroll", 4);
  assert.equal(ordered[4], "rickroll");
  assert.equal(ordered.length, items.length + 1);
  assert.equal(new Set(ordered).size, ordered.length);
});

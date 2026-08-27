import assert from "node:assert/strict";
import test from "node:test";
import {
  parseSpotifyPlaylistId,
  parseSpotifyTrackId,
} from "./parse-spotify-url.ts";

test("parses open.spotify.com track URLs", () => {
  assert.equal(
    parseSpotifyTrackId("https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp"),
    "3n3Ppam7vgaVa1iaRUc9Lp",
  );
  assert.equal(
    parseSpotifyTrackId("https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp?si=abc"),
    "3n3Ppam7vgaVa1iaRUc9Lp",
  );
});

test("parses playlist URLs", () => {
  assert.equal(
    parseSpotifyPlaylistId(
      "https://open.spotify.com/playlist/5zXp8gIyEeJteiSZj1RTqJ?si=3Tq-xR-DQRG91nhIYoihWA",
    ),
    "5zXp8gIyEeJteiSZj1RTqJ",
  );
  assert.equal(
    parseSpotifyPlaylistId("spotify:playlist:5zXp8gIyEeJteiSZj1RTqJ"),
    "5zXp8gIyEeJteiSZj1RTqJ",
  );
});

test("rejects invalid values", () => {
  assert.equal(parseSpotifyTrackId(""), null);
  assert.equal(parseSpotifyPlaylistId("https://open.spotify.com/track/abc"), null);
});

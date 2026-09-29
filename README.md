# Persistent portfolio music player

Next.js API + player for Blake's playlist. Deploy the API to **Netlify**, then drop the Framer code component onto blakeschubert.com.

## What this repo is

- **Netlify app** — Spotify playlist/track metadata + audio preview API, plus the surprise MP3
- **Framer component** — [`framer/BlakeMusicPlayer.tsx`](framer/BlakeMusicPlayer.tsx) paste into Framer

Spotify full-track streaming is not used (needs Web Playback SDK + Premium). The player uses 30s previews (or local filler MP3s while the real playlist is pending).

### Filler playlist (temporary)

`USE_FILLER_PLAYLIST` is currently `true` in:
- [`components/music-player/playlist.ts`](components/music-player/playlist.ts)
- [`framer/BlakeMusicPlayer.tsx`](framer/BlakeMusicPlayer.tsx)

That mode plays local `/audio/*.mp3` files while still loading Spotify title/artist/artwork for filler track links. When you have the real playlist, set both flags to `false` and update `SPOTIFY_PLAYLIST_URL` / the Framer **Playlist URL** control.

## 1. Deploy to Netlify

1. Push this repo to GitHub
2. In Netlify: **Add new site → Import from Git**
3. Build settings are in `netlify.toml` (Next.js plugin)
4. Deploy

Optional env vars in Netlify:

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
ALLOWED_ORIGINS=https://blakeschubert.com,https://www.blakeschubert.com
PLAYER_EXPAND_DIRECTION=up
```

`PLAYER_EXPAND_DIRECTION` is the backend toggle for placement:

- `up` — bottom-right, panel opens upward (default)
- `down` — top-right, panel opens downward (nav placement)

Confirm:

- `https://YOUR-SITE.netlify.app/api/player/config`
- `https://YOUR-SITE.netlify.app/api/spotify/playlist?url=https://open.spotify.com/playlist/5zXp8gIyEeJteiSZj1RTqJ`
- `https://YOUR-SITE.netlify.app/audio/never-gonna-give-you-up.mp3`

## 2. Add to Framer

1. Open your Framer project
2. **Assets → Code → New Component**
3. Paste the contents of [`framer/BlakeMusicPlayer.tsx`](framer/BlakeMusicPlayer.tsx)
4. On the component, set:
   - **API Base URL** → your Netlify site
   - **Playlist URL** → your Spotify playlist
   - **Playlist Name** → `Blake's Playlist`
   - **Variant** → Closed or Open
   - **Expand** → Up, Down, or **From backend**
5. Place the component **once** in a site-wide fixed overlay / template (or in the nav) so every page has it
6. Publish

## Expand direction

| Mode | Pill position | Opens | Good for |
| --- | --- | --- | --- |
| **Up** | Bottom-right | Upward | Corner player |
| **Down** | Top-right | Downward | Nav / header |
| **From backend** | From `PLAYER_EXPAND_DIRECTION` | Same | Flip without re-pasting Framer |

Local demo overrides: `http://localhost:3000/?expand=down`

## Behavior

- Loads your Spotify playlist (or filler tracks), shuffles it
- Shows artwork / title / artist as **Blake's Playlist**
- After the 4th song → Never Gonna Give You Up
- Collapsed pill expands in place; direction is configurable

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000

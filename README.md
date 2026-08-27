# Persistent portfolio music player

Next.js API + player for Blake's playlist. Deploy the API to **Netlify**, then drop the Framer code component onto blakeschubert.com.

## What this repo is

- **Netlify app** — Spotify playlist/track metadata + audio preview API, plus the surprise MP3
- **Framer component** — [`framer/BlakeMusicPlayer.tsx`](framer/BlakeMusicPlayer.tsx) paste into Framer

Spotify full-track streaming is not used (needs Web Playback SDK + Premium). The player uses 30s previews.

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
```

After deploy, confirm:

- `https://YOUR-SITE.netlify.app/api/spotify/playlist?url=https://open.spotify.com/playlist/5zXp8gIyEeJteiSZj1RTqJ`
- `https://YOUR-SITE.netlify.app/audio/never-gonna-give-you-up.mp3`

## 2. Add to Framer

1. Open your Framer project
2. **Assets → Code → New Component**
3. Paste the contents of [`framer/BlakeMusicPlayer.tsx`](framer/BlakeMusicPlayer.tsx)
4. On the component, set:
   - **API Base URL** → `https://blake-music-player.netlify.app`
   - **Playlist URL** → your Spotify playlist (already set)
   - **Playlist Name** → `Blake's Playlist`
5. In the right panel, set **Expand** → **Open up** or **Open down**
6. Place the component **once** in a site-wide fixed overlay / template so every page has it
7. Publish

## Expand variants

- **Open up** — pill sits bottom-right; panel grows upward (default)
- **Open down** — pill sits top-right; panel grows downward

Duplicate the component in Framer if you want both placements on different pages, and set Expand per instance.

## Behavior

- Loads your Spotify playlist, shuffles it
- Shows artwork / title / artist as **Blake's Playlist**
- After the 4th song → Never Gonna Give You Up
- Collapsed pill bottom-right; expands in place

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000

# Blake portfolio nav + music player

Glass pill nav for Framer (desktop) with About / Work / home avatar / music player / LinkedIn / email / resume. Netlify hosts the Spotify preview API + audio assets.

## What this repo is

- **Netlify app** — Spotify metadata/preview API, filler audio, resume file
- **Next.js demo** — [`components/nav/PillNav.tsx`](components/nav/PillNav.tsx) with the existing player embedded
- **Framer component** — paste [`framer/BlakeMusicPlayer.tsx`](framer/BlakeMusicPlayer.tsx) (exports `BlakeNavBar`)

## Pill nav

Two floating glass pills:

1. **Left** — About · Work · avatar (home) · LinkedIn · Email · Resume  
2. **Right** — music player pill that morphs/resizes into the full player

| Control | Behavior |
| --- | --- |
| About / Work | Navigate |
| Avatar initials | Home (swap for your photo later) |
| Music pill | Same player UI; compact on the right, expands in place |
| LinkedIn | Opens profile in a new tab |
| Email | Copies address + toast |
| Resume | Downloads `/resume.pdf` |

Design notes: Apple / Linear / Stripe-style glass capsules, music pill morphs width + radius when opened, solid fallback when `backdrop-filter` or reduced transparency is unavailable.

## Filler playlist (temporary)

`USE_FILLER_PLAYLIST` is `true` in `components/music-player/playlist.ts` and the Framer file. Flip both to `false` when the real Spotify playlist is ready.

## Deploy (Netlify)

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
ALLOWED_ORIGINS=https://blakeschubert.com,https://www.blakeschubert.com
PLAYER_EXPAND_DIRECTION=down
```

Confirm:

- `/api/player/config`
- `/api/spotify/playlist?url=...`
- `/audio/never-gonna-give-you-up.mp3`
- `/resume.pdf`

## Framer

1. **Assets → Code → New Component**
2. Paste [`framer/BlakeMusicPlayer.tsx`](framer/BlakeMusicPlayer.tsx)
3. Set API Base URL, About/Work/Home URLs, LinkedIn, email, resume URL
4. Place once in a site-wide desktop overlay / template
5. Publish

Mobile can stay on your separate Framer setup for now.

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000

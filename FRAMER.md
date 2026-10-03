# Framer agent — make BlakeNavBar a component (fast path)

Yes — this is the supported Framer External Agent flow. One file + one prompt.

| Give the agent… | Path |
| --- | --- |
| **Component file** | [`framer/BlakeMusicPlayer.tsx`](framer/BlakeMusicPlayer.tsx) |
| **Copy-paste prompt** | [`framer/GIVE_TO_FRAMER_AGENT.md`](framer/GIVE_TO_FRAMER_AGENT.md) |

## 60-second setup

```bash
npx @framer/agent@latest setup
```

1. New agent thread → paste your Framer **project link** → `/framer` → approve access  
2. Open this repo in the workspace  
3. Paste the prompt from `framer/GIVE_TO_FRAMER_AGENT.md` (everything under the line)

The agent creates the code component and places it at **720×56**, overflow visible.

Docs: [framer.com/agents/external](https://www.framer.com/agents/external/)

## What’s already baked into the file

- Glass nav + music pill
- Live links: home, `/about`, `#all-campus` (Selected Work), `#why-im-looking`
- Fixed embed shell, overflow visible, no scrollbars
- Netlify API / logo / resume defaults

## Alt: Netlify iframe (`/embed`)

Nav-only transparent page for Framer / Netlify iframes (no code component):

- **URL:** `https://blake-music-player.netlify.app/embed`
- Renders only PillNav + music player
- Transparent background, no scrollbars, overflow visible for the expanded player

See [`framer/COPY_INTO_FRAMER.md`](framer/COPY_INTO_FRAMER.md) §5 for the iframe snippet.

## Alt: GitHub Link plugin

Sync the `framer/` folder from this repo into Framer, then place `BlakeNavBar`.

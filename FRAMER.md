# Framer agent setup

This repo ships a ready-to-place Framer code component: [`framer/BlakeMusicPlayer.tsx`](framer/BlakeMusicPlayer.tsx) (exports `BlakeNavBar`).

Use either path below so an agent can put it on your Framer page — no manual paste required once connected.

## Option A — Framer external agent (recommended)

Connect Cursor / Claude Code / Codex to your Framer project, then point the agent at this repo.

### One-time local setup

```bash
npx @framer/agent@latest setup
```

Details: [framer.com/agents/external](https://www.framer.com/agents/external/)

### Connect + place

1. Open a new agent thread in Cursor (or Claude Code / Codex).
2. Paste your Framer project link (browser address bar, or App → right-click project tab → Copy Project Link).
3. Run `/framer` if the skill does not connect automatically; approve browser access.
4. Open this repo (or paste the component file) and send the prompt in [`framer/AGENT_PROMPT.md`](framer/AGENT_PROMPT.md).

The agent will create/update the code file in Framer and place a fixed **720×56** instance with **overflow visible** on a site-wide overlay.

## Option B — GitHub Link plugin (sync folder)

Keeps Framer code components versioned in this repo.

1. In Framer, install **GitHub Link** (Marketplace).
2. Connect with a GitHub PAT that can read this repo.
3. Select repo `bschuby212/portfoliomusic`, branch `main` (or your working branch).
4. Set the sync directory to `framer/`.
5. Sync `BlakeMusicPlayer.tsx` → Framer, then place `BlakeNavBar` on a site-wide overlay.

After that, edits in either place can sync both ways.

## Embed rules (must match)

| Setting | Value |
| --- | --- |
| Frame size | **720 × 56** (fixed) |
| Overflow | **Visible** |
| Scroll | **Off** |
| Placement | Site-wide desktop overlay, top / centered |
| Expand behavior | Music player spills out of the frame (absolute); shell size must not grow |

API / assets still come from the Netlify deploy (`apiBaseUrl`, logo, resume). Set those in the component props after placement.

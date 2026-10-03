# Give this to your Framer agent

Do **not** use a Netlify iframe for the nav. Iframes can’t see Framer scroll, so the glass morph never runs. Install the **code component** below. Keep Netlify only as the API host (`apiBaseUrl`).

## Before you paste (once)

1. On your machine: `npx @framer/agent@latest setup`
2. New Cursor / Claude / Codex thread
3. Paste your Framer project link → run `/framer` → approve browser access
4. Keep this repo open in the workspace (so the agent can read the file)

## Copy everything below this line into the agent

---

Create a Framer **code component** from this repo and put it on the site. Do not redesign it.

**Source file (read and use verbatim):** `framer/BlakeMusicPlayer.tsx`  
**Component name:** `BlakeNavBar`  
**Default export:** already `BlakeNavBar`

### Create the code file
1. Read `framer/BlakeMusicPlayer.tsx` in full (from branch `main`).
2. Create or overwrite a Framer code file named `BlakeNavBar` with **exactly** that source.
3. Do not rewrite, simplify, restyle, or split the file. Property controls and defaults are already correct.

### Place it on the page
1. Insert **one** `BlakeNavBar` instance on a site-wide desktop overlay / template (or every primary page if no overlay exists).
2. Pin near the top, horizontally centered, high z-index so it sits above page content.
3. Frame size: **fixed 720 × 56** (not fill, not hug).
4. Layer **Overflow = Visible**. Scroll = off. No clipping parent.
5. Leave props at file defaults:
   - `apiBaseUrl` → `https://blake-music-player.netlify.app`
   - Home → `https://blakeschubert.com/`
   - About → `https://blakeschubert.com/about`
   - Work → `https://blakeschubert.com/#all-campus`
   - Why I'm looking → `https://blakeschubert.com/#why-im-looking`
   - Email → `blakeschubertux@gmail.com`
6. Music player expands outside the 720×56 shell on purpose — that must stay visible (no scrollbars).
7. Confirm scrolling the **Framer page** morphs plain text nav → glass pill.

### Done when
- Code file exists in the Framer project
- One instance is on the canvas at 720×56, overflow visible
- Scroll morph works on the live/preview page
- Brief confirm with a screenshot if you can

---

## If the agent can’t read the repo

Attach or paste the full contents of `framer/BlakeMusicPlayer.tsx` after the prompt above, and say: “Use this exact file contents as the code component.”

Raw file: https://raw.githubusercontent.com/bschuby212/portfoliomusic/main/framer/BlakeMusicPlayer.tsx

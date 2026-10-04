# Give this to your Framer agent

Install the **code component** below (always-on glass pill — no scroll morph). Keep Netlify as the API host (`apiBaseUrl`).

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
1. Read `framer/BlakeMusicPlayer.tsx` in full from branch `cursor/embed-expand-right-653c` (or `main` after merge).
2. Create or overwrite a Framer code file named `BlakeNavBar` with **exactly** that source.
3. Do not rewrite, simplify, restyle, or split the file. Property controls and defaults are already correct.
4. Confirm defaults use `https://genuine-cheesecake-75fecc.netlify.app` for apiBaseUrl, logoUrl, and resumeUrl (not blake-music-player.netlify.app, not relative paths).

### Place it on the page
1. Insert **one** `BlakeNavBar` instance on a site-wide desktop overlay / template (or every primary page if no overlay exists).
2. Pin near the top, horizontally centered, high z-index so it sits above page content.
3. Frame size: **fixed 720 × 56** (not fill, not hug).
4. Layer **Overflow = Visible**. Scroll = off. No clipping parent.
5. Leave props at file defaults (these must stay absolute Netlify URLs — relative paths break in Framer):
   - `apiBaseUrl` → `https://genuine-cheesecake-75fecc.netlify.app`
   - `logoUrl` → `https://genuine-cheesecake-75fecc.netlify.app/avatar.png`
   - `resumeUrl` → `https://genuine-cheesecake-75fecc.netlify.app/Blake_Schubert_Product_Designer_Resume_2026.pdf`
   - Home → `https://blakeschubert.com/`
   - About → `https://blakeschubert.com/about`
   - Work → `https://blakeschubert.com/#all-campus`
   - Why I'm looking → `https://blakeschubert.com/#why-im-looking`
   - Email → `blakeschubertux@gmail.com`
   - LinkedIn → `https://www.linkedin.com/in/blake-schubert/`
6. Music player expands outside the 720×56 shell on purpose — that must stay visible (no scrollbars).
7. Confirm the nav renders as a glass pill immediately (no scroll needed).

### Done when
- Code file exists in the Framer project
- One instance is on the canvas at 720×56, overflow visible
- Glass pill is visible without scrolling
- Brief confirm with a screenshot if you can

---

## If the agent can’t read the repo

Attach or paste the full contents of `framer/BlakeMusicPlayer.tsx` after the prompt above, and say: “Use this exact file contents as the code component.”

Raw file (after merge): https://raw.githubusercontent.com/bschuby212/portfoliomusic/main/framer/BlakeMusicPlayer.tsx  

Raw file (this fix, before merge): https://raw.githubusercontent.com/bschuby212/portfoliomusic/cursor/embed-expand-right-653c/framer/BlakeMusicPlayer.tsx

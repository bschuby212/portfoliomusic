# Prompt to send a Framer-connected agent

Copy everything below the line into a Framer-connected agent thread (after `/framer` + project link). Keep this repo open in the workspace so the agent can read the source file.

---

Place Blake’s glass nav + music player on the site using the code component in this repo.

## Source of truth

- File: `framer/BlakeMusicPlayer.tsx`
- Default export: `BlakeNavBar`
- Read that file and create or update a Framer code component with the same contents (do not rewrite or simplify the CSS/JSX).

## Placement

1. Create/update the code file named `BlakeNavBar` (or `BlakeMusicPlayer`) with the full source.
2. On every primary page (or a site-wide desktop overlay / template), insert one instance of `BlakeNavBar`.
3. Pin it near the top, horizontally centered.
4. Set the instance layout to **fixed width 720** and **fixed height 56**.
5. Set layer **Overflow = Visible**. Do not enable scroll on the frame or parent.
6. Keep `pointer-events` / stacking so the pills stay clickable above page content (`z-index` high enough on the overlay).

## Props to set after insert

- `apiBaseUrl` → Netlify app URL (default in file is fine if already deployed)
- `homeUrl`, `aboutUrl`, `workUrl`, `lookingUrl` → your Framer page paths
- `linkedinUrl`, `email`, `resumeUrl`, `logoUrl` → real contact/logo URLs
- `variant` → `Closed` for collapsed music pill

## Do not

- Do not wrap the component in a scrolling frame
- Do not stretch the frame taller than 56 when collapsed
- Do not clip overflow — the expanded music player must spill visibly below/right of the 720×56 shell

Confirm when the component is on the page and the frame is 720×56 with overflow visible.

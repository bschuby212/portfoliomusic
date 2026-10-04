# PASTE THIS WHOLE FILE TO YOUR FRAMER AGENT

Delete any old BlakeNavBar / music nav code component first. Then install this one.

## Do exactly this

1. Read this raw file in full (do not invent / redesign):
   https://raw.githubusercontent.com/bschuby212/portfoliomusic/cursor/framer-working-defaults-653c/framer/BlakeMusicPlayer.tsx
2. Create or overwrite a Framer code file named **BlakeNavBar** with **exactly** that source.
3. Place **one** instance on a site-wide overlay / template.
4. Frame: **fixed 720 × 56** (not fill, not hug).
5. Position: **Fixed**, top center, high z-index.
6. Layer **Overflow = Visible**. No clipping parent stack.
7. Props must be (reset to defaults if wrong):
   - `apiBaseUrl` = `https://genuine-cheesecake-75fecc.netlify.app`
   - `logoUrl` = `https://genuine-cheesecake-75fecc.netlify.app/avatar.png`
   - `resumeUrl` = `https://genuine-cheesecake-75fecc.netlify.app/Blake_Schubert_Product_Designer_Resume_2026.pdf`
   - LinkedIn = `https://www.linkedin.com/in/blake-schubert/`
   - Email = `blakeschubertux@gmail.com`
8. Remove any Netlify `/embed` iframe for this nav (don’t run both).
9. Confirm: glass pills visible, LinkedIn/mail/resume are SVG icons (not emoji), play starts a 30s preview.

## Done when
- BlakeNavBar code file exists with the genuine-cheesecake defaults
- One 720×56 Fixed instance, Overflow Visible
- Play works (audio preview), icons look correct
- Screenshot if you can

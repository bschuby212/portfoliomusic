# FULL COPY-PASTE FOR FRAMER

## 1) Paste this entire block to Framer Agent

```
Create a Framer CODE COMPONENT from this repo. Do not redesign it.

SOURCE OF TRUTH (use verbatim):
- File: framer/BlakeMusicPlayer.tsx
- Component name: BlakeNavBar
- Default export: BlakeNavBar

STEPS:
1. Read framer/BlakeMusicPlayer.tsx in full from the repo.
2. Create or overwrite a Framer code file named BlakeNavBar with that source.
3. Priority: a working installed component > byte-identical copy. If a trailing backtick or similar typo makes the file unparseable, delete only that typo so TypeScript parses — do not redesign or restyle.
4. Place ONE BlakeNavBar instance on a site-wide desktop overlay / template (or every primary page if no overlay exists).
5. Pin near the top, horizontally centered, high z-index above page content.
6. Frame size: FIXED 720 × 56 (not fill, not hug).
7. Layer Overflow = Visible. Scroll = off. No clipping parent.
8. Music player expands outside the 720×56 shell on purpose — must stay visible (no scrollbars).
9. Keep these default link props:
   - Home: https://blakeschubert.com/
   - About: https://blakeschubert.com/about
   - Work: https://blakeschubert.com/#all-campus
   - Why I'm looking: https://blakeschubert.com/#why-im-looking

VISUAL TOKENS (already baked into the file — do not change):
- Ink / text: #212324
- Muted: #6a6a6a
- Elevated underfill: #FAF9F6 @ 35%
- Elevated gradient 155°: white 100% → 54% → 76%
- Border: white 100%, 1px
- Radius: 999 (pill)
- Backdrop blur: 132px, saturate 190%
- Shadow: black 7%, Y 10, Blur 28
- Scroll morph: 36px → 168px (plain text nav → glass pill)
- Top of page (scroll 0): no fill / no blur / no border

DONE WHEN:
- Code file exists in the Framer project
- One instance is on the canvas at 720×56, Overflow Visible
- Confirm with a screenshot if you can
```

If the agent cannot read the repo, paste the full contents of `framer/BlakeMusicPlayer.tsx` after the prompt and say: “Use this exact file contents as the code component.”


## 2) Manual remake values (if not using the code component)

### Text
```
Ink / body text: #212324
Muted:           #6a6a6a
Elevated links:  #212324 @ 88%
Top links:       #212324 @ 72%
Icons:           #212324 @ 55% → 88% elevated
```

### Elevated glass pill
```
Underfill:       #FAF9F6 @ 35%
Gradient:        155°
  0%:            #FFFFFF @ 100%
  55%:           #FFFFFF @ 54%
  100%:          #FFFFFF @ 76%
Border:          #FFFFFF @ 100%, 1px
Radius:          999
Background Blur: 132
Saturate:        190%
Shadow:          black 7%, X 0, Y 10, Blur 28, Spread 0
```

### Expanded music panel
```
Underfill:       #FAF9F6 @ 35%
Gradient:        160° · #FFFFFF 100% → 76%
Border:          #FFFFFF @ 100%
Radius:          21px
```

### Layout
```
Frame:           720 × 56
Overflow:        Visible
Gap nav↔music:   16px
Scroll morph:    36 → 168px
```

### Links
```
Home:            https://blakeschubert.com/
About:           https://blakeschubert.com/about
Work:            https://blakeschubert.com/#all-campus
Why I'm looking: https://blakeschubert.com/#why-im-looking
```


## 3) CSS paste (elevated state)

```css
color: #212324;
background-color: rgba(250, 249, 246, 0.35);
background-image: linear-gradient(
  155deg,
  rgba(255, 255, 255, 1) 0%,
  rgba(255, 255, 255, 0.54) 55%,
  rgba(255, 255, 255, 0.76) 100%
);
border: 1px solid rgba(255, 255, 255, 1);
border-radius: 999px;
box-shadow:
  0 1px 0 rgba(255, 255, 255, 0.8) inset,
  0 -1px 0 rgba(255, 255, 255, 0.22) inset,
  0 0 0 0.5px rgba(0, 0, 0, 0.045),
  0 10px 28px rgba(0, 0, 0, 0.07);
backdrop-filter: blur(132px) saturate(190%);
-webkit-backdrop-filter: blur(132px) saturate(190%);
```

### Scroll-driven (0 → 1)

```css
color: #212324;
background-color: rgba(250, 249, 246, calc(0.35 * var(--pn-elevate)));
background-image: linear-gradient(
  155deg,
  rgba(255, 255, 255, calc(1 * var(--pn-elevate))) 0%,
  rgba(255, 255, 255, calc(0.54 * var(--pn-elevate))) 55%,
  rgba(255, 255, 255, calc(0.76 * var(--pn-elevate))) 100%
);
border: 1px solid rgba(255, 255, 255, calc(1 * var(--pn-elevate)));
backdrop-filter: blur(calc(var(--pn-elevate) * 132px)) saturate(calc(100% + (var(--pn-elevate) * 90%)));
-webkit-backdrop-filter: blur(calc(var(--pn-elevate) * 132px)) saturate(calc(100% + (var(--pn-elevate) * 90%)));
```


## 4) Full component source

Repo path: `framer/BlakeMusicPlayer.tsx`  
Branch: `cursor/collapsed-album-spin-653c`  
Raw: https://raw.githubusercontent.com/bschuby212/portfoliomusic/cursor/collapsed-album-spin-653c/framer/BlakeMusicPlayer.tsx

## H) Expanded player

Expanded panel is the official Spotify playlist embed (full tracks). Collapsed pill: note · disc · play · chevron. Do not show our playlist name in custom chrome.

# FULL COPY-PASTE FOR FRAMER

Use the **code component** (not a Netlify iframe). Iframes cannot see Framer page scroll, so the glass morph never runs.

Netlify is still required as the **API host** for playlist + preview audio (`apiBaseUrl`).

## 1) Paste this entire block to Framer Agent

```
Create a Framer CODE COMPONENT from this repo. Do not redesign it.

SOURCE OF TRUTH (use verbatim):
- File: framer/BlakeMusicPlayer.tsx
- Component name: BlakeNavBar
- Default export: BlakeNavBar

STEPS:
1. Read framer/BlakeMusicPlayer.tsx in full from the repo (branch main).
2. Create or overwrite a Framer code file named BlakeNavBar with that source.
3. Priority: a working installed component > byte-identical copy. If a trailing backtick or similar typo makes the file unparseable, delete only that typo so TypeScript parses — do not redesign or restyle.
4. Place ONE BlakeNavBar instance on a site-wide desktop overlay / template (or every primary page if no overlay exists).
5. Pin near the top, horizontally centered, high z-index above page content.
6. Frame size: FIXED 720 × 56 (not fill, not hug).
7. Layer Overflow = Visible. Scroll = off. No clipping parent.
8. Music player expands outside the 720×56 shell on purpose — must stay visible (no scrollbars).
9. Collapsed music pill (~9.2rem): note · spinning disc · play/pause · chevron →. Expanded: short card (art + title/artist · shuffle + play · collapse ←). No progress, skip, or volume.
10. Keep apiBaseUrl = https://genuine-cheesecake-75fecc.netlify.app (playlist + preview API).
11. Keep these default link / asset props (absolute URLs only — relative paths break in Framer):
   - Home: https://blakeschubert.com/
   - About: https://blakeschubert.com/about
   - Work: https://blakeschubert.com/#all-campus
   - Why I'm looking: https://blakeschubert.com/#why-im-looking
   - Email: blakeschubertux@gmail.com (mailto)
   - LinkedIn: https://www.linkedin.com/in/blake-schubert/
   - Logo: https://genuine-cheesecake-75fecc.netlify.app/avatar.png
   - Resume: https://genuine-cheesecake-75fecc.netlify.app/Blake_Schubert_Product_Designer_Resume_2026.pdf

VISUAL TOKENS (already baked into the file — do not change):
- Ink / text: #212324
- Muted: #6a6a6a
- Elevated underfill: #FAF9F6 @ 52%
- Elevated gradient 155°: white 82% → 48% → 64%
- Border: black 8%, 1px (reads on #fff)
- Radius: 999 (pill)
- Backdrop blur: 64px, saturate 150%
- Shadow: black 8%, Y 8, Blur 24
- Always-on glass pill (no scroll morph — archived on cursor/scroll-elevate-archive-653c)

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
Underfill:       #FAF9F6 @ 52%
Gradient:        155°
  0%:            #FFFFFF @ 82%
  55%:           #FFFFFF @ 48%
  100%:          #FFFFFF @ 64%
Border:          black @ 8%, 1px
Radius:          999
Background Blur: 64
Saturate:        150%
Shadow:          black 8%, X 0, Y 8, Blur 24, Spread 0
```

### Expanded music panel
```
Underfill:       #FAF9F6 @ ~82% when open
Radius:          21px (1.3rem)
Content:         art + title/artist · shuffle + play · collapse ←
                 (no progress, skip, or volume)
Audio:           ~30s previews via Netlify API (Spotify playlist + Deezer/iTunes preview)
```

### Collapsed music pill
```
Width:           ~9.2rem
Controls:        note · disc · play/pause · expand chevron →
```

### Layout
```
Frame:           720 × 56
Overflow:        Visible
Gap nav↔music:   16px
Glass:           always on
```

### Links
```
Home:            https://blakeschubert.com/
About:           https://blakeschubert.com/about
Work:            https://blakeschubert.com/#all-campus
Why I'm looking: https://blakeschubert.com/#why-im-looking
Email:           mailto:blakeschubertux@gmail.com
Resume:          Blake Schubert Product Designer Resume 2026.pdf (via Netlify)
API base:        https://genuine-cheesecake-75fecc.netlify.app
Logo:            https://genuine-cheesecake-75fecc.netlify.app/avatar.png
Resume:          https://genuine-cheesecake-75fecc.netlify.app/Blake_Schubert_Product_Designer_Resume_2026.pdf
```


## 3) CSS paste (elevated state)

```css
color: #212324;
background-color: rgba(250, 249, 246, 0.52);
background-image: linear-gradient(
  155deg,
  rgba(255, 255, 255, 0.82) 0%,
  rgba(255, 255, 255, 0.48) 55%,
  rgba(255, 255, 255, 0.64) 100%
);
border: 1px solid rgba(0, 0, 0, 0.08);
border-radius: 999px;
box-shadow:
  0 1px 0 rgba(255, 255, 255, 0.75) inset,
  0 -1px 0 rgba(255, 255, 255, 0.2) inset,
  0 0 0 0.5px rgba(0, 0, 0, 0.04),
  0 8px 24px rgba(0, 0, 0, 0.08);
backdrop-filter: blur(64px) saturate(150%);
-webkit-backdrop-filter: blur(64px) saturate(150%);
```

### Elevate-scaled (0 → 1)

```css
color: #212324;
background-color: rgba(250, 249, 246, calc(0.52 * var(--pn-elevate)));
background-image: linear-gradient(
  155deg,
  rgba(255, 255, 255, calc(0.82 * var(--pn-elevate))) 0%,
  rgba(255, 255, 255, calc(0.48 * var(--pn-elevate))) 55%,
  rgba(255, 255, 255, calc(0.64 * var(--pn-elevate))) 100%
);
border: 1px solid rgba(0, 0, 0, calc(0.08 * var(--pn-elevate)));
backdrop-filter: blur(calc(var(--pn-elevate) * 64px)) saturate(calc(100% + (var(--pn-elevate) * 50%)));
-webkit-backdrop-filter: blur(calc(var(--pn-elevate) * 64px)) saturate(calc(100% + (var(--pn-elevate) * 50%)));
```


## 4) Full component source

Repo path: `framer/BlakeMusicPlayer.tsx`  
Branch: `cursor/embed-expand-right-653c`  
Raw: https://raw.githubusercontent.com/bschuby212/portfoliomusic/cursor/embed-expand-right-653c/framer/BlakeMusicPlayer.tsx

## H) Expanded player

Expanded panel is the **custom** player UI (transport/scrub/volume). Spotify is used only for the track list + preview audio. Collapsed pill: note · disc · play · chevron. Do not show our playlist name.


## 5) Netlify `/embed` iframe (optional)

Short bar only (~72px). Browsers clip iframes, so expand needs the iframe
to grow — but use **`position: fixed`** so growth overlays the page and
**does not push / move layout**. No drop shadows on the embed pills.

Paste this **Embed → HTML** in Framer (do NOT set the Framer layer to 240px):

```html
<!-- 72px spacer only — page layout never changes on expand -->
<div style="height:72px;width:100%;pointer-events:none;"></div>
<div id="blake-embed-wrap" style="position:fixed;top:0;left:0;right:0;height:72px;z-index:9999;">
  <iframe
    id="blake-embed"
    src="https://genuine-cheesecake-75fecc.netlify.app/embed"
    title="Blake nav"
    style="display:block;width:100%;height:72px;border:0;background:transparent;"
    allow="autoplay; encrypted-media; clipboard-write"
  ></iframe>
</div>
<script>
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "blake-embed-height") return;
    const h = Math.max(72, Number(data.height) || 72);
    const iframe = document.getElementById("blake-embed");
    const wrap = document.getElementById("blake-embed-wrap");
    if (iframe) iframe.style.height = h + "px";
    if (wrap) wrap.style.height = h + "px";
  });
</script>
```

- Collapsed = 72px. Expand grows the **fixed** overlay only — spacer stays 72px, page does not jump.
- Prefer the code component when you want the nav native to the Framer page.

Keep Netlify for:
- `GET /api/spotify` + `/api/spotify/playlist`
- Resume PDF + avatar assets
- `apiBaseUrl` / avatar / resume defaults: `https://genuine-cheesecake-75fecc.netlify.app`

# Copy into Framer

## A) Paste this to Framer Agent

```
Create a Framer code component from this repo. Do not redesign it.

Source file (use verbatim): framer/BlakeMusicPlayer.tsx
Component name: BlakeNavBar
Default export: BlakeNavBar

1. Read framer/BlakeMusicPlayer.tsx in full.
2. Create/overwrite Framer code file BlakeNavBar with exactly that source.
3. Place ONE instance on a site-wide desktop overlay / template.
4. Pin near top, horizontally centered, high z-index.
5. Frame: fixed 720 × 56 (not fill, not hug).
6. Overflow = Visible. Scroll = off. No clipping parent.
7. Keep default link props (blakeschubert.com).
8. Music player expands outside the 720×56 shell on purpose — must stay visible.

Done when: code file exists, one instance on canvas at 720×56 overflow visible.
```

If the agent can’t read the repo, also paste the full contents of `framer/BlakeMusicPlayer.tsx`.


## B) Manual glass values (elevated pill)

Use these on the elevated / scrolled glass state:

```
Underfill:     #FAF9F6 @ 35% opacity
Gradient:      155°
  0%:          #FFFFFF @ 100%
  55%:         #FFFFFF @ 54%
  100%:        #FFFFFF @ 76%
Border:        #FFFFFF @ 100%, 1px
Radius:        999 (full pill)
Background Blur: 132
Saturate:      190% (if available)
Shadow:        black 7%, X 0, Y 10, Blur 28, Spread 0
```

Top-of-page (scroll 0): no underfill, no gradient, no border, no blur.


## C) Expanded music panel

```
Underfill:     #FAF9F6 @ 35%
Gradient:      160° · #FFFFFF 100% → 76%
Border:        #FFFFFF @ 100%
Radius:        21px (1.3rem)
```


## D) Layout shell

```
Frame:         720 × 56
Overflow:      Visible
Gap nav↔music: 16px
Scroll morph:  60px → 120px (text bar → glass pill)
```


## E) CSS you can paste into a code component / style block

```css
/* Elevated glass (when --pn-elevate: 1) */
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

Scroll-driven version (0 → 1):

```css
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


## F) Link defaults

```
Home:            https://blakeschubert.com/
About:           https://blakeschubert.com/about
Work:            https://blakeschubert.com/#all-campus
Why I'm looking: https://blakeschubert.com/#why-im-looking
```

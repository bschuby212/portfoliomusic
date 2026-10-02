# Glass Optic — Framer remake stats

Use these when rebuilding the elevated (scrolled) pill in Framer Styles / Effects.
Top-of-page state is **no fill / no blur / no border** (transparent).

## Elevated pill fill (nav + music)

| Token | Value | Framer |
| --- | --- | --- |
| Base fill | `#FAF9F6` @ **99%** opacity | Fill → solid `#FAF9F6`, Opacity **99** |
| Gradient overlay | 155° | Linear gradient, angle **155°** |
| Gradient stop 0% | `#FFFFFF` @ **100%** | |
| Gradient stop 55% | `#FFFFFF` @ **96%** | |
| Gradient stop 100% | `#FFFFFF` @ **98%** | |
| Border | `#FFFFFF` @ **90%**, **1px** | Border → white, opacity 90, width 1 |
| Radius | **999** (full pill) | Radius → **999** / fully rounded |
| Backdrop blur | **64px** | Effects → Background Blur **64** |
| Saturate | **200%** | If available; else skip |
| Inset highlight top | white **95%**, `0 1px 0` | Inner shadow / shine |
| Inset bottom | white **35%**, `0 -1px 0` | |
| Hairline | black **6%**, `0 0 0 0.5px` | |
| Drop shadow | black **12%**, `0 14px 36px` | Shadow Y **14**, Blur **36**, Opacity **12** |

### Expanded music panel (open player)

| Token | Value |
| --- | --- |
| Base fill | `#FAF9F6` @ **99.5%** |
| Gradient | 160° · white 100% → white 98% |
| Radius | **20.8px** (`1.3rem`) |
| Drop shadow | black **14%**, `0 18px 44px` |

## Type / icons (elevated)

| Token | Value |
| --- | --- |
| Label color | `rgba(15,15,15,0.88)` ≈ `#0F0F0F` @ 88% |
| Label weight | **600** |
| Hover / active | `#0A0A0A` |
| Font size | **14px** (`.875rem`) |
| Icon button size | **39.2px** (`2.45rem`) |
| Avatar | **43.2px** (`2.7rem`) circle |

## Layout (elevated / glass)

| Token | Value |
| --- | --- |
| Nav pill max width | **~486–560px** content-hug (not full bleed) |
| Nav min-height | **~54px** (`3.4rem`) |
| Nav padding | `~5px 6px 5px 5px` (compact) |
| Gap nav ↔ music | **16px** |
| Music collapsed width | **126.4px** (`7.9rem`) |
| Music expanded width | **340px** (`21.25rem`) |
| Embed / Framer frame | **720 × 56**, Overflow **Visible** |

## Scroll elevate (behavior)

| Token | Value |
| --- | --- |
| Start morph | **60px** scroll |
| End morph (full glass) | **120px** scroll |
| Ease | ease-out (`1 - (1-t)^2.2`) |
| Top state | fill/blur/border **0**; nav width **responsive** (~full row) |

## Quick Framer style recipe

1. Frame: **720×56**, Overflow Visible  
2. Pill: Fill `#FAF9F6` **99%** + white gradient 155° (100→96→98)  
3. Effects: Background Blur **64**, Shadow `0 14 36` @ 12% black  
4. Border: 1px white @ 90%, Radius full  
5. Text: 14 / SemiBold / `#0F0F0F` @ 88%  

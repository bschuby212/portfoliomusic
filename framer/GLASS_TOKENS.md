# Glass Optic — Framer remake stats

Subtle frosted glass with a light cream underfill.
Top-of-page state: **no fill / no blur / no border** (`elevate = 0`).

## Elevated pill (nav + music)

| Token | Value | Framer |
| --- | --- | --- |
| Underfill | cream `#FAF9F6` @ **14%** | Fill opacity **14** (scales with elevate) |
| Gradient | 155° over underfill | Linear gradient |
| Stop 0% | white @ **48%** | opacity **48** |
| Stop 55% | white @ **20%** | opacity **20** |
| Stop 100% | white @ **28%** | opacity **28** |
| Border | white @ **40%**, **1px** | |
| Radius | **999** (full pill) | |
| Backdrop blur | **48px** | Background Blur **48** |
| Saturate | **130%** | if available |
| Drop shadow | black **3%**, `0 4px 14px` | Y **4**, Blur **14**, Op **3** |

### Expanded music panel

| Token | Value |
| --- | --- |
| Underfill | cream `#FAF9F6` @ **55%** |
| Gradient | 160° · white **48% → 28%** |
| Border | white **40%** |
| Radius | **1.3rem** (~21px) |
| Content | art + title/artist · shuffle + play · collapse ← (no progress / skip / volume) |

## Compared to previous heavy glass

| | Previous | Now |
| --- | --- | --- |
| Underfill | cream 35% | **cream 14%** |
| Gradient | 100 / 54 / 76 | **48 / 20 / 28** |
| Border | 100% | **40%** |
| Blur | 118–132px | **48px** |
| Saturate | 180–190% | **130%** |

## Layout

| Token | Value |
| --- | --- |
| Frame | **720 × 56**, Overflow **Visible** |
| Gap nav ↔ music | **16px** |
| Scroll morph | archived — always-on glass |

# Glass Optic — Framer remake stats

True frosted glass (not opaque underfill). Current elevated fill after +47% from prior step.
Top-of-page state: **no fill / no blur / no border**.

## Elevated pill (nav + music)

| Token | Value | Framer |
| --- | --- | --- |
| Base fill | **none / transparent** | No solid underfill |
| Gradient | 155° | Linear gradient |
| Stop 0% | white @ **100%** | `#FFFFFF` opacity **100** |
| Stop 55% | white @ **54%** | opacity **54** |
| Stop 100% | white @ **76%** | opacity **76** |
| Border | white @ **100%**, **1px** | |
| Radius | **999** (full pill) | |
| Backdrop blur | **132px** | Background Blur **132** |
| Saturate | **190%** | if available |
| Drop shadow | black **7%**, `0 10px 28px` | Y **10**, Blur **28**, Op **7** |

### Expanded music panel

| Token | Value |
| --- | --- |
| Gradient | 160° · white **100% → 76%** |
| Border | white **100%** |
| Radius | **1.3rem** (~21px) |

## Compared to original glass

| | Original | Now |
| --- | --- | --- |
| Gradient | 42 / 14 / 22 | **100 / 54 / 76** |
| Border | 55% | **100%** |
| Blur | 40px | **132px** |

## Layout

| Token | Value |
| --- | --- |
| Frame | **720 × 56**, Overflow **Visible** |
| Gap nav ↔ music | **16px** |
| Scroll morph | **60 → 120px** |

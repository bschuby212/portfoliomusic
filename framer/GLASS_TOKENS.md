# Glass Optic — Framer remake stats

True frosted glass (not opaque). Current elevated fill after +38% from prior step.
Top-of-page state: **no fill / no blur / no border**.

## Elevated pill (nav + music)

| Token | Value | Framer |
| --- | --- | --- |
| Base fill | **none / transparent** | No solid underfill |
| Gradient | 155° | Linear gradient |
| Stop 0% | white @ **94%** | `#FFFFFF` opacity **94** |
| Stop 55% | white @ **37%** | opacity **37** |
| Stop 100% | white @ **52%** | opacity **52** |
| Border | white @ **95%**, **1px** | |
| Radius | **999** (full pill) | |
| Backdrop blur | **90px** | Background Blur **90** |
| Saturate | **190%** | if available |
| Drop shadow | black **7%**, `0 10px 28px` | Y **10**, Blur **28**, Op **7** |

### Expanded music panel

| Token | Value |
| --- | --- |
| Gradient | 160° · white **99% → 52%** |
| Border | white **95%** |
| Radius | **1.3rem** (~21px) |

## Compared to original glass

| | Original | Now |
| --- | --- | --- |
| Gradient | 42 / 14 / 22 | **94 / 37 / 52** |
| Border | 55% | **95%** |
| Blur | 40px | **90px** |

## Layout

| Token | Value |
| --- | --- |
| Frame | **720 × 56**, Overflow **Visible** |
| Gap nav ↔ music | **16px** |
| Scroll morph | **60 → 120px** |

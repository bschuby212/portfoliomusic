# Glass Optic — Framer remake stats

True frosted glass (not opaque). Original optic + ~22% denser fill (~15% then +7%).
Top-of-page state: **no fill / no blur / no border**.

## Elevated pill (nav + music)

| Token | Value | Framer |
| --- | --- | --- |
| Base fill | **none / transparent** | No solid underfill |
| Gradient | 155° | Linear gradient |
| Stop 0% | white @ **53.5%** | `#FFFFFF` opacity **54** |
| Stop 55% | white @ **21%** | opacity **21** |
| Stop 100% | white @ **30%** | opacity **30** |
| Border | white @ **68%**, **1px** | |
| Radius | **999** (full pill) | |
| Backdrop blur | **51px** | Background Blur **51** |
| Saturate | **190%** | if available |
| Inset top | white **80%**, `0 1px 0` | |
| Inset bottom | white **22%**, `0 -1px 0` | |
| Hairline | black **4.5%**, `0 0 0 0.5px` | |
| Drop shadow | black **7%**, `0 10px 28px` | Y **10**, Blur **28**, Op **7** |

### Expanded music panel

| Token | Value |
| --- | --- |
| Gradient | 160° · white **62% → 30%** |
| Border | white **71%** |
| Radius | **1.3rem** (~21px) |
| Drop shadow | black **9%**, `0 16px 40px` |

## Compared to original glass

| | Original | Now (~+22%) |
| --- | --- | --- |
| Gradient | 42 / 14 / 22 | **53.5 / 21 / 30** |
| Border | 55% | **68%** |
| Blur | 40px | **51px** |

## Type (elevated)

| Token | Value |
| --- | --- |
| Label | `#0F0F0F` @ **88%**, weight **600**, size **14px** |
| Hover / active | `#0A0A0A` |

## Layout

| Token | Value |
| --- | --- |
| Frame | **720 × 56**, Overflow **Visible** |
| Gap nav ↔ music | **16px** |
| Music collapsed | **7.9rem** (~126px) |
| Scroll morph | **60 → 120px** |

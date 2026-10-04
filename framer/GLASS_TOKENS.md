# Glass Optic — Framer remake stats

Filled frosted glass that still reads on `#ffffff` (edge + fill + soft lift).
Top-of-page state: **no fill / no blur / no border** (`elevate = 0`).

## Elevated pill (nav + music)

| Token | Value | Framer |
| --- | --- | --- |
| Underfill | cream `#FAF9F6` @ **52%** | Fill opacity **52** (scales with elevate) |
| Gradient | 155° over underfill | Linear gradient |
| Stop 0% | white @ **82%** | opacity **82** |
| Stop 55% | white @ **48%** | opacity **48** |
| Stop 100% | white @ **64%** | opacity **64** |
| Border | black @ **8%**, **1px** | visible on white |
| Radius | **999** (full pill) | |
| Backdrop blur | **64px** | Background Blur **64** |
| Saturate | **150%** | if available |
| Drop shadow | black **8%**, `0 8px 24px` | Y **8**, Blur **24**, Op **8** |

### Expanded music panel

| Token | Value |
| --- | --- |
| Underfill | cream `#FAF9F6` @ **82%** |
| Gradient | 160° · white **90% → 72%** |
| Border | black **8%** |
| Radius | **1.3rem** (~21px) |
| Content | art + title/artist · shuffle + play · collapse ← |

## Why these values

White borders + thin fills disappear on `#ffffff`. This set uses a cream/white frost fill, a soft dark hairline, and a light drop shadow so the pills read as filled glass even with no page background.

## Layout

| Token | Value |
| --- | --- |
| Frame | **720 × 56**, Overflow **Visible** |
| Gap nav ↔ music | **16px** |
| Scroll morph | archived — always-on glass |

# canonspike.com

Personal landing page for [Paul Reioux](https://canonspike.com).

## Stack

- Vanilla HTML5, CSS3, and JavaScript — no build system, no npm, no frameworks
- Google Fonts: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) + [Inter](https://fonts.google.com/specimen/Inter)
- Scroll animations via the [IntersectionObserver API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

## Design

Dark editorial aesthetic inspired by the Chinese Ox lucky colors:
- Background: `#0a0a0a` (near-black)
- Primary accent: `#C9A84C` (antique gold)
- Secondary accent: `#3D7A52` (forest green)
- Text: `#F5F5F0` (off-white)

## Files

| File | Purpose |
|---|---|
| `index.html` | Single-page markup |
| `style.css` | All styles, custom properties, animations |
| `main.js` | Scroll animations, parallax, footer year |
| `images/profile.svg` | Profile photo placeholder (SVG avatar) |

## Local Development

No build step required. Open `index.html` directly in any modern browser, or run a local server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

### Cloudflare Pages

1. Push to GitHub
2. Connect repo in [Cloudflare Pages](https://pages.cloudflare.com/) dashboard
3. Build command: *(leave empty)*
4. Publish directory: `/` (root)
5. Add custom domain: `canonspike.com`

### GitHub Pages

1. Go to repo **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Add custom domain in the Pages settings

## Drivers page languages (2026-10-21)

`/drivers/` is in English plus the nine FauxVkDB languages: `/drivers/es/`, `it`, `fr`, `de`, `ja`,
`pt` (Brazil), `zh-cn`, `zh-tw`, `id`. The rest of canonspike.com is English only.

- `drivers/index.html` is the source. `i18n/en.txt` lists every piece of its text, one per line;
  `i18n/<lang>.txt` holds the same lines translated, in the same order.
- After changing English text: `python3 tool/i18n.py extract`, change the same line numbers in every
  `i18n/<lang>.txt`, then `python3 tool/i18n.py build`, commit, and `bash tool/deploy.sh`.
- Device and chip names carry `translate="no"`. Each release line is `<span class="ver" hidden>` with an
  empty `<span class="tag">`: `releases.js` fills the tag from `/api/releases` and shows the line.
- Since 2026-10-27 the page holds no version numbers, so a driver release needs no page edit, build,
  or deploy. If `/api/releases` fails, the release line stays hidden and **Download** still opens the
  repo's releases page.
- The translations were written by Claude and no native speaker has read them.

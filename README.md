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

---
id: web-brand-assets
title: Brand Assets (Logo, Favicons, App Icons)
status: review
owner: Marko Angelovski
last_updated: 2026-10-25
related: [web-screens, web-static-export, api-conventions]
---

# Brand Assets (Logo, Favicons, App Icons)

## Purpose
Records the PM4 logo as SVG code and how to rebuild every icon file from it. The raster files (PNG, ICO) are
renders, so the SVG below is the only source anyone needs to change the logo.

## Scope
- **In:** the mark, its variants, every icon file in `web/` and `api/`, the icons the web app manifest lists, and
  how to regenerate them.
- **Out:** a wordmark (the UI sets "PM4" as text, SCR-004), custom splash screens (the platforms draw them from the
  manifest's icon and `background_color`), and social preview images. The manifest itself: `static-export.md`.

## The mark
Concept C, "Stack" (chosen by the owner on 2026-10-25, T-0109): three staggered bars on a near-black tile, like
tasks on a timeline. It's drawn on a 32-unit grid, and every bar edge sits on an even unit, so it stays crisp at
16 px (one unit is half a pixel there).

| Part | Geometry | Colour |
| --- | --- | --- |
| Tile | `<rect width="32" height="32" rx="6"/>` | `#171717` (the light theme's `--primary`) |
| Edge | `<rect x="0.5" y="0.5" width="31" height="31" rx="5.5" fill="none" stroke="#404040"/>` | `#404040`, 1 unit, inside the tile |
| Bars | `<rect x="6" y="8" …/>`, `<rect x="10" y="14" …/>`, `<rect x="14" y="20" …/>`, each `width="12" height="4"` | `#fafafa` (`--primary-foreground`) |

The edge separates the tile from dark backgrounds. On light ones it's practically invisible. It's drawn only
on small icons: at 192 px and up it becomes a heavy border.

The source is `web/public/images/logos/logoicon.svg` (tile + edge + bars):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#171717"/><rect x="0.5" y="0.5" width="31" height="31" rx="5.5" fill="none" stroke="#404040"/><g fill="#fafafa"><rect x="6" y="8" width="12" height="4"/><rect x="10" y="14" width="12" height="4"/><rect x="14" y="20" width="12" height="4"/></g></svg>
```

## Variants
Every variant comes from the source by removing or changing one part.

| Variant | Change from the source | Used by |
| --- | --- | --- |
| **edged** | none (the source) | sidebar logo, `favicon.ico` |
| **adaptive** | the edge gets `class="edge"`, and `<style>.edge{display:none}@media (prefers-color-scheme:dark){.edge{display:inline}}</style>` comes first | `web/app/icon.svg` (the browser tab) |
| **plain** | no edge | 192 and 512 px app icons |
| **bleed** | the tile is a square without `rx`, and there's no edge (the platform applies its own mask) | `apple-icon.png` |
| **maskable** | bleed, with the bars wrapped in `<g transform="translate(16 16) scale(0.8) translate(-16 -16)">` so they stay inside Android's 80 % safe zone | `icon-maskable-512.png` |

## Files

| File | Variant | Size | Notes |
| --- | --- | --- | --- |
| `web/public/images/logos/logoicon.svg` | edged | 32 vector | Sidebar logo (SCR-004). Its path is pinned by `full-logo.ac.test.tsx` |
| `web/app/icon.svg` | adaptive | vector | Next file convention: emits `<link rel="icon" type="image/svg+xml">` |
| `web/app/favicon.ico` | edged | 16, 32, 48 | Next file convention. One ICO, three PNG entries |
| `web/app/apple-icon.png` | bleed | 180 | Next file convention: emits `apple-touch-icon`. Opaque (iOS fills transparency with black) |
| `web/public/icons/icon-192.png` | plain | 192 | `app/manifest.ts` (`purpose: "any"`) |
| `web/public/icons/icon-512.png` | plain | 512 | `app/manifest.ts` (`purpose: "any"`) |
| `web/public/icons/icon-maskable-512.png` | maskable | 512 | `app/manifest.ts` (`purpose: "maskable"`) |
| `api/src/assets/favicon.ico` | edged | 16, 32, 48 | Byte-identical to `web/app/favicon.ico`. Served at `/favicon.ico` (`03-api/conventions.md#openapi`) |

## Rebuild recipe
After you change the SVG, regenerate the files above. Use the `sharp` that `web/` already has (a dependency of
Next), from a throwaway script **outside the repo**: don't add a script, npm command or dependency for this.

1. Write each variant's SVG as a string (see *Variants*).
2. Render each PNG at its exact size. Rasterise at the target size, never downscale a larger render, so the
   bars land on whole pixels:
   ```js
   const sharp = require("<repo>/web/node_modules/sharp");
   const png = (svg, size) =>
     sharp(Buffer.from(svg), { density: (72 * size) / 32 })
       .resize(size, size)
       .png({ compressionLevel: 9, palette: true, quality: 100 })
       .toBuffer();
   ```
3. Pack `favicon.ico` from the 16, 32 and 48 px PNGs of the edged variant. An ICO file is a 6-byte header,
   a 16-byte entry per image, then the PNGs:
   ```js
   function ico(images /* [[size, pngBuffer], ...] */) {
     const head = Buffer.alloc(6 + 16 * images.length);
     head.writeUInt16LE(1, 2); // type: icon
     head.writeUInt16LE(images.length, 4);
     let offset = head.length;
     images.forEach(([size, buf], i) => {
       const o = 6 + 16 * i;
       head.writeUInt8(size, o); // width (0 means 256)
       head.writeUInt8(size, o + 1); // height
       head.writeUInt16LE(1, o + 4); // colour planes
       head.writeUInt16LE(32, o + 6); // bits per pixel
       head.writeUInt32LE(buf.length, o + 8);
       head.writeUInt32LE(offset, o + 12);
       offset += buf.length;
     });
     return Buffer.concat([head, ...images.map(([, b]) => b)]);
   }
   ```
4. Copy `web/app/favicon.ico` to `api/src/assets/favicon.ico`.
5. Check the result:
   - Look at the 16 and 32 px renders zoomed in (nearest-neighbour), on white and on `#0a0a0a`.
   - In `web/`: `npm test` (`full-logo.ac.test.tsx`) and `npm run build`. `out/index.html` must link
     `favicon.ico`, `icon.svg`, `apple-icon.png` and `manifest.webmanifest`.
   - In `api/`: `npm run build` must put `dist/src/assets/favicon.ico` next to `dist/src/app.setup.js`, and
     `test/favicon.e2e-spec.ts` must pass.

## Open questions
—

## Changelog
- 2026-10-25: Initial version: the Stack mark, its variants, the icon files and the rebuild recipe (T-0109, T-0110).
- 2026-10-25: The app icons are now listed by the web app manifest (feat-shell-pwa).

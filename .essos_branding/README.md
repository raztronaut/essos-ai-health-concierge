# Essos Branding (extracted)

Design system tokens extracted from [essos.com](https://www.essos.com/) using [dembrandt](https://github.com/dembrandt/dembrandt) v0.19.5 on 2026-06-18.

## Extraction scope

Multi-page crawl (5 pages): `/`, `/about`, `/blog`, `/board`, `/treatments`

## Files

| File | Description |
|------|-------------|
| `DESIGN.md` | AI-readable design system doc (YAML tokens + markdown) |
| `*.tokens.json` | W3C Design Tokens (DTCG) format — import into Figma/Tokens Studio or Style Dictionary |
| `*.json` | Full dembrandt extraction (colors, typography, spacing, components, motion, logo, favicons) |

## Key brand tokens

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Surface | `#f5f1e5` | Warm off-white background |
| On-surface | `#171715` | Primary text |
| Secondary | `#bcb6a7` | Borders, muted UI |
| Muted | `#8d897d` | Secondary text |

### Typography

- **Display / headings:** PS Times Regular, `header` — 72px, 48px
- **Body / UI:** `body`, ABC Repro Regular, ABC Repro Medium — 11px–30px scale
- **Spacing base:** 8px grid

### Logo & assets

- Inline SVG logo (87×20px, fill `#f5f1e5`)
- Full logo SVG: `https://essos-public.s3.us-west-1.amazonaws.com/prod/assets/essos-full-logo.svg`
- OG image: `https://essos-patient-public-assets.s3.us-west-1.amazonaws.com/graphics/essos.png`

### Components

- Buttons: 6px radius, 8px 16px padding, transparent bg, `#171715` text, 1px border
- Border radius scale: 6px, 12px
- Breakpoints: 1933px → 1728px → 1440px → 1199px → 843px → 810px

## Re-run extraction

```bash
npx dembrandt https://www.essos.com/ --save-output --design-md --dtcg --crawl 5 --slow
```

Then copy `output/essos.com/*` into this folder.

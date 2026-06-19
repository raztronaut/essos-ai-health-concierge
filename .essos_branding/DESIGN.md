---
name: "Essos"
description: "Canonical Essos brand design tokens (palette + typefaces supplied by Essos)."
palette:
  pearl-white: "#EBE4D1"
  stone-10: "#D4CDBC"
  stone-20: "#BCB6A7"
  stone-30: "#A5A092"
  stone-40: "#8D897D"
  stone-50: "#767269"
  stone-60: "#5E5B54"
  stone-70: "#46443F"
  stone-80: "#2F2E2A"
  stone-90: "#171715"
  black: "#000000"
colors:
  primary: "#171715"
  secondary: "#BCB6A7"
  surface: "#EBE4D1"
  on-surface: "#171715"
fonts:
  serif: "PS Times (display / masthead)"
  sans: "ABC Repro (UI + body)"
  mono: "ABC Repro Mono (code / IDs / tabular)"
typography:
  text-1:
    fontFamily: "header"
    fontSize: "72px"
    fontWeight: 400
    lineHeight: 1
  text-2:
    fontFamily: "PS Times Regular"
    fontSize: "72px"
    fontWeight: 400
    lineHeight: 1
  text-3:
    fontFamily: "header"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: 1
  text-4:
    fontFamily: "PS Times Regular"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "\"blwf\", \"cv03\", \"cv04\", \"cv09\", \"cv11\""
  text-5:
    fontFamily: "body"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1.2
  text-6:
    fontFamily: "body"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.38
  text-7:
    fontFamily: "ABC Repro Regular"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.15
  text-8:
    fontFamily: "ABC Repro Medium"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.2
    fontFeature: "\"blwf\", \"cv03\", \"cv04\", \"cv09\", \"cv11\""
  text-9:
    fontFamily: "body"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.33
  text-10:
    fontFamily: "body"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.33
  text-11:
    fontFamily: "header"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1
  text-12:
    fontFamily: "body"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.4
  text-13:
    fontFamily: "ABC Repro Medium"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.2
  text-14:
    fontFamily: "ABC Repro Regular"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.2
  text-15:
    fontFamily: "ABC Repro Medium"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.15
    fontFeature: "\"blwf\", \"cv03\", \"cv04\", \"cv09\", \"cv11\""
  text-16:
    fontFamily: "body"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.56
  text-17:
    fontFamily: "body"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.56
  text-18:
    fontFamily: "body"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  text-19:
    fontFamily: "body"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.5
  text-20:
    fontFamily: "body"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  text-21:
    fontFamily: "body"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.43
  text-22:
    fontFamily: "ABC Repro Regular"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.2
  text-23:
    fontFamily: "ABC Repro Medium"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.3
    fontFeature: "\"blwf\", \"cv03\", \"cv04\", \"cv09\", \"cv11\""
  text-24:
    fontFamily: "body"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
  text-25:
    fontFamily: "sans-serif"
    fontSize: "12px"
    fontWeight: 400
  text-26:
    fontFamily: "body"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
  text-27:
    fontFamily: "ABC Repro Regular"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.3
spacing:
  base: "8px"
  xs: "1px"
  sm: "4px"
  md: "5px"
  lg: "6px"
  xl: "8px"
  xxl: "12px"
  xxxl: "16px"
  xxxxl: "18px"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "14px"
components:
  button-observed:
    backgroundColor: "#FFFFFF"
    textColor: "#000000"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
---

# Design System

## Overview
Canonical Essos brand tokens. The warm-neutral ramp and typefaces below are the
official brand assets supplied by Essos; the dashboard implements them in
`dashboard/app/styles/tokens.css` (palette + semantic colors) and
`dashboard/app/layout.tsx` (fonts via `next/font/local`). Logos live in
`dashboard/public/brand/`.

## Palette — Pearl White → Black
The brand is monochrome warm-neutral, stepped in 10% increments. Each step is
exposed as a token (`--color-pearl`, `--color-stone-10` … `--color-stone-90`,
`--color-black`) and generates Tailwind utilities (`bg-stone-50`, `text-stone-70`, …).

| Token | Hex | RGB |
| --- | --- | --- |
| Pearl White | `#EBE4D1` | 235, 228, 209 |
| Stone 10 | `#D4CDBC` | 212, 205, 188 |
| Stone 20 | `#BCB6A7` | 188, 182, 167 |
| Stone 30 | `#A5A092` | 165, 160, 146 |
| Stone 40 | `#8D897D` | 141, 137, 125 |
| Stone 50 | `#767269` | 118, 114, 105 |
| Stone 60 | `#5E5B54` | 94, 91, 84 |
| Stone 70 | `#46443F` | 70, 68, 63 |
| Stone 80 | `#2F2E2A` | 47, 46, 42 |
| Stone 90 | `#171715` | 23, 23, 21 |
| Black | `#000000` | 0, 0, 0 |

### Semantic mapping
- **Surface** (`#EBE4D1`, Pearl White): page background.
- **Card** (`#F3EEDE`): warm white lifted just above the pearl surface.
- **Ink / On-surface** (`#171715`, Stone 90): primary text.
- **Primary** (`#171715`): monochrome brand black for solid actions and focus rings.
- **Secondary** (`#BCB6A7`, Stone 20): accents, dividers, fills.
- **Muted** (`#767269`, Stone 50): legible secondary text.
- **Border** (`#D4CDBC`, Stone 10): hairline borders.

## Typography
- **Serif / display** — **PS Times** (`--font-serif`): masthead, page titles, headings (`.serif`).
- **Sans / UI + body** — **ABC Repro** (`--font-sans`): default body and interface text.
- **Mono** — **ABC Repro Mono** (`--font-mono`): code, identifiers, and tabular data.

Indicative scale (from the source site):
- **Text 1**: serif (PS Times), 72px, regular
- **Text 3**: serif (PS Times), 48px, regular
- **Text 5**: sans (ABC Repro), 30px, medium
- **Text 6**: sans (ABC Repro), 28px, medium

## Layout
Observed spacing scale: 8px spacing scale.
- **Spacing tokens**: base 8px, xs 1px, sm 4px, md 5px, lg 6px, xl 8px, xxl 12px, xxxl 16px, xxxxl 18px
- **Responsive breakpoints**: 1933px, 1728px, 1440px, 1199px, 843px, 810px

## Elevation & Depth
Observed box-shadow styles: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0 0 0 / 0.22) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px

## Shapes
Observed rounded-corner tokens: sm 6px, md 8px, lg 12px, xl 14px.

## Components
- **Buttons**: Observed sample with radius 6px, text #171715, padding 8px 16px, border 1px solid rgb(70, 68, 63)

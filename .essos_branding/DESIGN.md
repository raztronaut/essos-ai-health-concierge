---
name: "Essos"
description: "Design tokens extracted from https://www.essos.com/"
colors:
  primary: "#0000EE"
  secondary: "#BCB6A7"
  surface: "#F5F1E5"
  on-surface: "#171715"
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
Design tokens extracted from essos.com. The YAML front matter contains machine-readable values observed by Dembrandt when available; the sections below summarize the extracted evidence without redesigning or correcting the source site.

## Colors
- **Primary** (#0000EE): Observed color token extracted from the site's palette, semantic CSS, or component styles.
- **Secondary** (#BCB6A7): Observed color token extracted from the site's palette, semantic CSS, or component styles.
- **Surface** (#F5F1E5): Observed color token extracted from the site's palette, semantic CSS, or component styles.
- **On Surface** (#171715): Observed color token extracted from the site's palette, semantic CSS, or component styles.

## Typography
- **Text 1**: header, 72px, regular
- **Text 2**: PS Times Regular, 72px, regular
- **Text 3**: header, 48px, regular
- **Text 4**: PS Times Regular, 48px, regular
- **Text 5**: body, 30px, medium
- **Text 6**: body, 28px, medium

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

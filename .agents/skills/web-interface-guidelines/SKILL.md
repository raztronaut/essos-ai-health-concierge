---
name: web-interface-guidelines
description: Apply a checklist of details that make a high-quality web interface, covering interactivity, typography, motion, touch, performance, accessibility, and design. Use when building or reviewing web UI — forms, inputs, buttons, dialogs, menus, animations, focus states, or when the user asks for a UI/UX review or polish pass. Based on interfaces.rauno.me.
---

# Web Interface Guidelines

A checklist of details that make a good web interface. Apply when writing or reviewing front-end UI code. Not every item applies to every component — use judgment, but treat these as the default bar.

Source: [interfaces.rauno.me](https://interfaces.rauno.me/)

## Interactivity

- Clicking an input's label should focus its field (`<label for>` or wrapping).
- Wrap inputs in a `<form>` so Enter submits.
- Use an appropriate input `type` (`password`, `email`, `tel`, etc.).
- Disable `spellcheck` and `autocomplete` on inputs most of the time.
- Use the `required` attribute to leverage native HTML form validation.
- Absolutely position input prefix/suffix decorations (icons) over the input with padding; clicking them should focus the input — don't place them next to it.
- Toggles take effect immediately; never require a confirm step.
- Disable buttons after submission to prevent duplicate network requests.
- Disable `user-select` on the inner content of interactive elements.
- Disable `pointer-events` on decorative elements (glows, gradients) so they don't hijack events.
- No dead zones between items in a vertical/horizontal list — increase `padding` rather than adding gaps.

## Typography

- Apply `-webkit-font-smoothing: antialiased` and `text-rendering: optimizeLegibility`.
- Subset fonts based on content/alphabet/language.
- Don't change font weight on hover/selected — it causes layout shift.
- Don't use font weights below 400. Medium headings look best at 500–600.
- Size headings fluidly with `clamp()`, e.g. `font-size: clamp(48px, 5vw, 72px)`.
- Use `font-variant-numeric: tabular-nums` in tables/timers to avoid layout shift.
- Set `-webkit-text-size-adjust: 100%` to prevent iOS landscape text resizing.

## Motion

- Don't transition/animate elements when switching themes (use `next-themes` in Next.js).
- Keep interaction animations ≤ 200ms so they feel immediate.
- Make animation values proportional to trigger size:
  - Fade + scale dialogs from ~0.8 → 1, not 0 → 1.
  - Scale buttons on press to ~0.96/~0.9, not 0.8.
- Avoid extraneous animation on frequent, low-novelty actions (right-click menus, list add/delete, hovering trivial buttons).
- Pause looping animations when off-screen to save CPU/GPU.
- Use `scroll-behavior: smooth` for in-page anchors, with an appropriate offset.

## Touch

- Gate hover states behind `@media (hover: hover)` so they don't flash on touch.
- Input font size ≥ 16px to prevent iOS zoom on focus.
- Don't autofocus inputs on touch devices — it opens the keyboard and covers the screen.
- Add `muted` and `playsinline` to `<video>` for iOS autoplay.
- Disable `touch-action` for custom pan/zoom components to avoid native gesture interference.
- Replace the iOS tap highlight (`-webkit-tap-highlight-color: rgba(0,0,0,0)`) with a proper alternative — don't just remove it.

## Optimizations

- Large `blur()` values for `filter`/`backdrop-filter` can be slow.
- Scaling/blurring filled rectangles causes banding — use radial gradients instead.
- Use `transform: translateZ(0)` sparingly to force GPU rendering for janky animations.
- Toggle `will-change` only for the duration of an unperformant scroll animation, not preemptively.
- Too many autoplaying videos choke iOS — pause or unmount off-screen ones.
- Bypass React's render lifecycle with refs for real-time values that commit directly to the DOM (e.g. wheel/scroll deltas).
- Detect and adapt to the device's hardware and network capabilities.

## Accessibility

- No tooltips on disabled buttons — they're not in tab order and won't be announced.
- Use `box-shadow` for focus rings, not `outline` (older Safari ignores border radius).
- Make focusable items in a sequential list navigable with ↑/↓ and deletable with ⌘+Backspace.
- Open dropdown menus on `mousedown`, not `click`, for immediate response.
- Use an SVG favicon with a `<style>` that adapts to `prefers-color-scheme`.
- Give icon-only interactive elements an explicit `aria-label`.
- Hover tooltips must not contain interactive content.
- Render images with `<img>` for screen readers and right-click copy.
- Give HTML-built illustrations an `aria-label` instead of exposing the raw DOM tree.
- Unset gradient text on `::selection`.
- Use a "prediction cone" for nested menus so moving the pointer diagonally doesn't close them.

## Design

- Optimistically update data locally; roll back with feedback on server error.
- Run auth redirects on the server before the client loads to avoid janky URL changes.
- Style the document selection with `::selection`.
- Show feedback relative to its trigger:
  - Inline checkmark on successful copy, not a notification.
  - Highlight the offending input(s) on form errors.
- Empty states should prompt creation of a new item, with optional templates.

## Reviewing UI

When asked to review UI code, walk the relevant sections above and report findings grouped by severity:

- **Critical**: accessibility blockers (missing labels, keyboard traps, no focus state).
- **Suggestion**: correctness/UX gaps (duplicate submits, layout shift, hover-on-touch).
- **Nice to have**: polish (animation tuning, selection styling, empty states).

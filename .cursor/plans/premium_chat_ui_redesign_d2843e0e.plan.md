---
name: Premium Chat UI Redesign
overview: Redesign the dashboard chat interface into an asymmetric, grouped bubble layout with an integrated, borderless reply box to match the premium Essos branding.
todos:
  - id: group-messages
    content: Update message-thread.tsx to pass grouping flags
    status: completed
  - id: redesign-bubbles
    content: Redesign message-bubble.tsx with asymmetric bubbles and custom border-radii
    status: completed
  - id: redesign-reply-box
    content: Redesign concierge-reply-box.tsx with integrated editor layout
    status: completed
  - id: verify-build
    content: Verify with typecheck and build
    status: completed
isProject: false
---

# Premium Chat UI Redesign

This plan details the visual and UX overhaul of the dashboard chat interface. By shifting from full-width cards with heavy borders to an asymmetric, grouped bubble layout with an integrated reply box, we will create a highly polished, natural conversation flow that matches the premium Essos brand identity.

## Proposed Changes

### 1. Message Thread Grouping
We will update `dashboard/features/conversations/message-thread.tsx` to analyze the message array and pass grouping flags (`isGroupedWithPrev` and `isGroupedWithNext`) to each `MessageBubble`. This allows us to group consecutive messages from the same sender, tighten the spacing between them, and hide redundant headers.

- File: `dashboard/features/conversations/message-thread.tsx`
- Logic:
  - Map over messages and compare the current message's role with the previous and next messages.
  - Wrap the thread in a flex container with `flex flex-col gap-1` (tight spacing for grouped messages) and add custom margin spacing when the sender changes.

### 2. Asymmetric Message Bubbles
We will completely redesign `dashboard/features/conversations/message-bubble.tsx` to implement asymmetric alignment, premium typography, custom border-radii, and unified brand colors:

- File: `dashboard/features/conversations/message-bubble.tsx`
- Layout:
  - **Patient (Incoming)**: Left-aligned, styled with a clean warm-white background (`bg-card`), a very fine border (`border-border/40`), and rounded corners that taper on the top-left (`rounded-2xl rounded-tl-sm`).
  - **Concierge (Outgoing)**: Right-aligned, styled with a solid dark background (`bg-stone-90 text-pearl`), and rounded corners that taper on the bottom-right (`rounded-2xl rounded-br-sm`).
  - **Eve (AI Assistant)**: Left-aligned, styled with a premium, soft-tinted background (`bg-stone-10/40`) and a fine border (`border-stone-20/60`), with a small, elegant "AI" badge or sparkling icon.
  - **System Messages**: Centered, small, muted, no card/border. Just clean italic text.
- Grouping Details:
  - If `isGroupedWithPrev` is true, hide the sender header and avatar completely to remove visual noise.
  - Adjust the border-radius of consecutive bubbles dynamically so they stack together beautifully (e.g., first bubble is rounded on top, middle bubbles are rounded on sides, last bubble is rounded on bottom).
  - Use the new variable fonts: ABC Repro for body text, ABC Repro Mono for metadata, and PS Times for display headers.

### 3. Integrated Reply Box
We will redesign `dashboard/features/conversations/concierge-reply-box.tsx` to look like a modern, integrated editor rather than a clunky form:

- File: `dashboard/features/conversations/concierge-reply-box.tsx`
- Design:
  - **Focus-ring Container**: Create a card container that gets the active focus ring when the inner textarea is focused.
  - **Borderless Textarea**: Make the textarea borderless and transparent, blending seamlessly into the card.
  - **Docked Actions**: Move all actions (the "Your name" signature input, "Clear draft" button, and "Send to patient" button) into a neat bottom bar inside the card container.
  - **Polished AI Draft Banner**: Style the AI draft suggestion banner with a soft beige background, a subtle border, and clean, minimal source pills with document icons.

## Verification Plan

### Automated Tests
- Run `npm run typecheck` inside the `dashboard` directory to ensure all TypeScript types are correct.
- Run `npm run build` inside the `dashboard` directory to verify that the Next.js production build succeeds with the new styles and fonts.

### Visual QA
- Verify that messages align correctly (Patient/Eve on the left, Concierge on the right).
- Verify that consecutive messages from the same sender group together with tight spacing and hide redundant headers.
- Verify that the reply box container gets a beautiful focus ring when typing.

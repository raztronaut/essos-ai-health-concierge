# Essos Reviewer Demo

This is the live work-trial path for Essos reviewers.

## What reviewers use

- Dashboard: https://essos-dashboard.vercel.app
- iMessage: text the live Spectrum number.
- Mini-app cards: Eve sends signed links to `https://patient-miniapp.vercel.app/p/<token>` as Spectrum Mini App cards when iMessage supports them, with a plain-link fallback. Move this to `https://mini.essos.dev` after DNS is attached to the mini-app deployment.

## Reviewer iMessage prompts

Text these from any reviewer iPhone. Guest mode provisions a private demo patient cloned from the seeded Maya itinerary, so no phone pre-binding is required.

- `What's my hotel confirmation number?`
- `Send me my itinerary card`
- `Can I see my source documents?`
- `What's my clinic address?`
- `I can't find my driver`
- `Can I take ibuprofen tonight?`

## Expected behavior

- Routine itinerary questions are answered in iMessage from Convex itinerary/source data.
- Card requests arrive as a Spectrum mini-app card when available, or a normal URL fallback.
- Opening the card shows itinerary, clinic, hotel, transport, confirmations, and source documents.
- Document rows can be viewed, shared, copied, or downloaded when the source file is available.
- High-risk/medical/missing-source prompts create a dashboard flag and pause Eve for human review.
- A concierge can reply from the dashboard, then Resolve + Resume Eve to hand the thread back.

## Operator checks

- Railway production services `eve`, `transport`, and `slack` should be running.
- The transport should use prod Convex: `CONVEX_SITE_URL=https://intent-hare-36.convex.site`.
- The transport should use `ESSOS_MINIAPP_DELIVERY=spectrum_app`.
- The transport should use `ESSOS_APPLE_TEAM_ID=6JY9M75PT4`.
- Do not run a local iMessage transport while Railway is live; Spectrum Cloud should have one live consumer.

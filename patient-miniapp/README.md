# @essos/patient-miniapp

Patient-facing mini app surface for Essos itinerary and clinic cards.

The app opens the same signed snapshot links that Eve can send from iMessage:

- `/p/demo` renders a seeded local demo payload.
- `/p/:token` fetches `GET $EXPO_PUBLIC_CARD_API_URL?token=:token`.
- `/p/:token/event/:eventId` renders a compact event/source detail view.

## Run

```bash
pnpm patient-miniapp:dev
pnpm patient-miniapp:ios
```

The first pass runs in Expo Go / simulator. The Apple bundle identifiers are:

- Main app: `com.essos.raziworktrial`
- App Clip: `com.essos.raziworktrial.Clip`

App Clip signing uses the Essos Apple team through environment/config values:

```bash
ESSOS_APPLE_TEAM_ID=6JY9M75PT4
ESSOS_PATIENT_MINIAPP_DOMAIN=patient-miniapp.vercel.app
EXPO_PUBLIC_CARD_API_URL=https://intent-hare-36.convex.site/miniapp/card
```

Generated `ios/` and `android/` projects are ignored. Keep source-owned native
target files in `targets/`, then run `pnpm --filter @essos/patient-miniapp run
prebuild` when Xcode/App Clip signing is ready.

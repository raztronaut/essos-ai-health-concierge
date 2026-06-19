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

The first pass runs in Expo Go / simulator. App Clip and iMessage extension
signing use the Essos Apple team through environment/config values:

```bash
ESSOS_APPLE_TEAM_ID=XXXXXXXXXX
ESSOS_PATIENT_MINIAPP_DOMAIN=mini.essos.dev
```

Generated `ios/` and `android/` projects are ignored. Keep source-owned native
target files in `targets/`, then run `pnpm --filter @essos/patient-miniapp run
prebuild` when Xcode/App Clip signing is ready.

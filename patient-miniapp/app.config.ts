import type { ExpoConfig } from "expo/config";

const domain = process.env.ESSOS_PATIENT_MINIAPP_DOMAIN ?? "mini.essos.dev";
const teamId = process.env.ESSOS_APPLE_TEAM_ID ?? "ESSOS_TEAM_ID";

const config: ExpoConfig = {
  name: "Essos Patient",
  slug: "essos-patient-miniapp",
  scheme: "essos-patient",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  plugins: ["expo-router", "@bacons/apple-targets"],
  experiments: {
    typedRoutes: true,
  },
  ios: {
    appleTeamId: teamId === "ESSOS_TEAM_ID" ? undefined : teamId,
    bundleIdentifier: "com.essos.concierge.patientmini",
    buildNumber: "1",
    supportsTablet: false,
    associatedDomains: [`applinks:${domain}`, `appclips:${domain}`],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  web: {
    bundler: "metro",
    output: "static",
  },
  extra: {
    appleTeamId: teamId,
    cardApiUrl:
      process.env.EXPO_PUBLIC_CARD_API_URL ??
      "http://127.0.0.1:3211/miniapp/card",
  },
};

export default config;

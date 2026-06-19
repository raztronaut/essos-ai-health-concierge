import type { ExpoConfig } from "expo/config";

const defaultAppleTeamId = "6JY9M75PT4";
const domain =
  process.env.ESSOS_PATIENT_MINIAPP_DOMAIN ?? "patient-miniapp.vercel.app";
const teamId = process.env.ESSOS_APPLE_TEAM_ID ?? defaultAppleTeamId;

const config: ExpoConfig = {
  name: "Razi Work Trial",
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
    appleTeamId: teamId,
    bundleIdentifier: "com.essos.raziworktrial",
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

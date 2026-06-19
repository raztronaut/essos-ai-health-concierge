const domain = process.env.ESSOS_PATIENT_MINIAPP_DOMAIN || "mini.essos.dev";

module.exports = {
  type: "clip",
  name: "EssosPatientMiniClip",
  bundleIdentifier: "com.essos.concierge.patientmini.Clip",
  deploymentTarget: "17.0",
  exportJs: false,
  entitlements: {
    "com.apple.developer.associated-domains": [
      `appclips:${domain}`,
      `applinks:${domain}`,
    ],
  },
  infoPlist: {
    CFBundleDisplayName: "Essos",
    ITSAppUsesNonExemptEncryption: false,
    NSAppClip: {
      NSAppClipRequestEphemeralUserNotification: false,
    },
  },
  sourceFiles: ["*.swift"],
};

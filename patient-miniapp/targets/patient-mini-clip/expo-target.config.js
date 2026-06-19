const domain = process.env.ESSOS_PATIENT_MINIAPP_DOMAIN || "mini.essos.dev";

module.exports = {
  type: "clip",
  name: "RaziWorkTrialClip",
  bundleIdentifier: "com.essos.raziworktrial.Clip",
  deploymentTarget: "17.0",
  exportJs: false,
  entitlements: {
    "com.apple.developer.associated-domains": [
      `appclips:${domain}`,
      `applinks:${domain}`,
    ],
  },
  infoPlist: {
    CFBundleDisplayName: "Razi Work Trial",
    ITSAppUsesNonExemptEncryption: false,
    NSAppClip: {
      NSAppClipRequestEphemeralUserNotification: false,
    },
  },
  sourceFiles: ["*.swift"],
};

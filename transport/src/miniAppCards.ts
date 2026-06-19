import type { PatientCardLink } from "@essos/shared";
import { app as spectrumApp } from "spectrum-ts";
import { customizedMiniApp } from "spectrum-ts/providers/imessage";
import type { MiniappDeliveryMode } from "./env.js";

export interface MiniAppCardConfig {
  appStoreId: number | null;
  appleTeamId: string | null;
  extensionBundleId: string;
  mode: MiniappDeliveryMode;
}

export interface MiniAppCardSendResult {
  delivered: boolean;
  mode: Exclude<MiniappDeliveryMode, "link"> | null;
  reason: string | null;
}

type NativeSend = (content: unknown) => Promise<boolean>;

export async function sendMiniAppCard(
  link: PatientCardLink,
  config: MiniAppCardConfig,
  sendNative: NativeSend
): Promise<MiniAppCardSendResult> {
  if (config.mode === "link") {
    return { delivered: false, mode: null, reason: "link mode" };
  }

  if (config.mode === "customized_miniapp") {
    const custom = buildCustomizedMiniApp(link, config);
    if (custom) {
      try {
        if (await sendNative(custom)) {
          return { delivered: true, mode: "customized_miniapp", reason: null };
        }
      } catch {
        // Fall through to the Spectrum app card. The caller logs the fallback
        // without token-bearing URL details.
      }
    }
  }

  try {
    if (await sendNative(spectrumApp(link.url))) {
      return { delivered: true, mode: "spectrum_app", reason: null };
    }
  } catch {
    return {
      delivered: false,
      mode: null,
      reason: "spectrum app card failed",
    };
  }

  return {
    delivered: false,
    mode: null,
    reason: "could not resolve iMessage space",
  };
}

function buildCustomizedMiniApp(
  link: PatientCardLink,
  config: MiniAppCardConfig
): unknown | null {
  if (!config.appleTeamId) {
    return null;
  }
  return customizedMiniApp({
    appName: "Razi Work Trial",
    appStoreId: config.appStoreId ?? undefined,
    extensionBundleId: config.extensionBundleId,
    teamId: config.appleTeamId,
    url: link.url,
    layout: {
      caption: "Essos itinerary",
      subcaption: "Tap for confirmations, clinic info, and source documents",
      trailingCaption: "Open",
      summary: `Open your Essos ${link.purpose.replace("_", " ")} card`,
    },
  });
}

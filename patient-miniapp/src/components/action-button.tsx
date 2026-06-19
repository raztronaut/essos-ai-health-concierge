import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { Pressable, Share, Text } from "react-native";
import { essosTheme } from "@/lib/theme";

const isIos = process.env.EXPO_OS === "ios";

export function ActionButton(props: {
  label: string;
  kind?: "primary" | "secondary" | "light" | "subtle" | "amber";
  onPress: () => Promise<void> | void;
  size?: "compact" | "regular";
}) {
  const kind = props.kind ?? "secondary";
  const compact = props.size === "compact";
  const palette = {
    amber: {
      background: essosTheme.color.amber,
      border: essosTheme.color.amber,
      text: "#1B1105",
    },
    light: {
      background: essosTheme.color.pearl,
      border: essosTheme.color.pearl,
      text: essosTheme.color.background,
    },
    primary: {
      background: essosTheme.color.green,
      border: essosTheme.color.green,
      text: essosTheme.color.background,
    },
    secondary: {
      background: essosTheme.color.panelRaised,
      border: essosTheme.color.lineStrong,
      text: essosTheme.color.pearl,
    },
    subtle: {
      background: "transparent",
      border: essosTheme.color.line,
      text: essosTheme.color.pearlSoft,
    },
  }[kind];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={async () => {
        if (isIos) {
          await Haptics.selectionAsync().catch(() => null);
        }
        await props.onPress();
      }}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: palette.background,
        borderColor: palette.border,
        borderCurve: "continuous",
        borderRadius: compact ? 8 : 10,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: compact ? 36 : 42,
        minWidth: compact ? 40 : 52,
        opacity: pressed ? 0.76 : 1,
        paddingHorizontal: compact ? 11 : 14,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <Text
        style={{
          color: palette.text,
          fontSize: compact ? 12.5 : 15,
          fontWeight: "800",
        }}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

export async function copyText(value: string): Promise<void> {
  const webClipboard = globalThis.navigator?.clipboard;
  if (webClipboard?.writeText) {
    await webClipboard.writeText(value).catch(() => Clipboard.setStringAsync(value));
    return;
  }
  await Clipboard.setStringAsync(value);
}

export async function openUrl(url: string): Promise<void> {
  const canOpen = await Linking.canOpenURL(url).catch(() => false);
  if (canOpen) {
    await Linking.openURL(url);
  }
}

export async function shareUrl(url: string): Promise<void> {
  await Share.share({ url, message: url });
}

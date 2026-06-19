import type React from "react";
import { Text, View } from "react-native";
import { essosTheme } from "@/lib/theme";

export function InfoCard(props: {
  actions?: React.ReactNode;
  children?: React.ReactNode;
  eyebrow?: string;
  title: string;
  tone?: "default" | "quiet" | "warning";
}) {
  const warning = props.tone === "warning";
  return (
    <View
      style={{
        backgroundColor: warning
          ? essosTheme.color.amberPanel
          : props.tone === "quiet"
            ? "transparent"
            : essosTheme.color.panel,
        borderColor: warning
          ? essosTheme.color.amberLine
          : essosTheme.color.line,
        borderCurve: "continuous",
        borderRadius: 14,
        borderWidth: 1,
        boxShadow: warning
          ? "0 0 0 1px rgba(246, 168, 0, 0.16)"
          : essosTheme.shadow.darkRing,
        gap: 12,
        padding: 16,
      }}
    >
      <View style={{ gap: 4 }}>
        {props.eyebrow ? (
          <Text
            selectable
            style={{
              color: warning ? essosTheme.color.amber : essosTheme.color.muted,
              fontSize: 12,
              fontWeight: "800",
              textTransform: "uppercase",
            }}
          >
            {props.eyebrow}
          </Text>
        ) : null}
        <Text
          selectable
          style={{
            color: warning ? essosTheme.color.pearl : essosTheme.color.pearl,
            fontSize: 20,
            fontWeight: "800",
          }}
        >
          {props.title}
        </Text>
      </View>
      {props.children}
      {props.actions ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {props.actions}
        </View>
      ) : null}
    </View>
  );
}

export function DataRow(props: {
  label: string;
  value: string | null;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  if (!props.value) {
    return null;
  }
  return (
    <View
      style={{
        alignItems: "center",
        borderTopColor: essosTheme.color.line,
        borderTopWidth: 1,
        flexDirection: "row",
        gap: 10,
        justifyContent: "space-between",
        minHeight: props.compact ? 36 : 44,
        paddingTop: props.compact ? 8 : 10,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{
            color: essosTheme.color.quiet,
            fontSize: 12,
            fontWeight: "800",
          }}
        >
          {props.label}
        </Text>
        <Text
          selectable
          style={{
            color: essosTheme.color.pearl,
            fontSize: props.compact ? 14 : 16,
            fontVariant: ["tabular-nums"],
            fontWeight: "700",
          }}
        >
          {props.value}
        </Text>
      </View>
      {props.action}
    </View>
  );
}

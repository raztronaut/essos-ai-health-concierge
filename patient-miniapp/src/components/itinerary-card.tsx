import { Link } from "expo-router";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { ActionButton, copyText, openUrl } from "@/components/action-button";
import { patientDocumentRoute } from "@/lib/card-api";
import { formatDateTime, kindLabel } from "@/lib/format";
import { essosTheme } from "@/lib/theme";
import type { ItineraryEvent } from "@/lib/types";

export function ItineraryCard(props: {
  event: ItineraryEvent;
  index: number;
  isLast: boolean;
  status: "completed" | "current" | "upcoming";
  token: string;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 430;
  const statusLabel = {
    completed: "Completed",
    current: "You are here",
    upcoming: "Upcoming",
  }[props.status];
  const markerBackground =
    props.status === "current"
      ? essosTheme.color.green
      : essosTheme.color.panel;

  return (
    <View style={{ flexDirection: "row", gap: compact ? 10 : 14 }}>
      <View style={{ alignItems: "center", width: compact ? 28 : 32 }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: markerBackground,
            borderColor:
              props.status === "current"
                ? "rgba(140, 184, 165, 0.65)"
                : essosTheme.color.lineStrong,
            borderRadius: 16,
            borderWidth: 1,
            height: compact ? 26 : 28,
            justifyContent: "center",
            width: compact ? 26 : 28,
          }}
        >
          <Text
            style={{
              color:
                props.status === "current"
                  ? essosTheme.color.background
                  : essosTheme.color.pearlSoft,
              fontSize: 12,
              fontVariant: ["tabular-nums"],
              fontWeight: "900",
            }}
          >
            {props.index + 1}
          </Text>
        </View>
        {props.isLast ? null : (
          <View
            style={{
              backgroundColor: essosTheme.color.lineStrong,
              flex: 1,
              marginTop: 6,
              minHeight: 108,
              width: 1,
            }}
          />
        )}
      </View>
      <View
        style={{
          flex: 1,
          gap: compact ? 9 : 10,
          minWidth: 0,
          paddingBottom: props.isLast ? 0 : compact ? 18 : 22,
        }}
      >
        <View style={{ gap: 3 }}>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <Text
              selectable
              style={{
                color: essosTheme.color.pearl,
                flexShrink: 1,
                fontSize: compact ? 20 : 22,
                fontWeight: "800",
                lineHeight: compact ? 24 : 27,
              }}
            >
              {props.event.title}
            </Text>
            <View
              style={{
                backgroundColor:
                  props.status === "current"
                    ? "rgba(140, 184, 165, 0.24)"
                    : "rgba(235, 228, 209, 0.06)",
                borderColor:
                  props.status === "current"
                    ? "rgba(140, 184, 165, 0.28)"
                    : essosTheme.color.line,
                borderRadius: 999,
                borderWidth: 1,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color:
                    props.status === "current"
                      ? essosTheme.color.green
                      : essosTheme.color.muted,
                  fontSize: 11,
                  fontWeight: "800",
                  lineHeight: 14,
                }}
              >
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text
            selectable
            style={{ color: essosTheme.color.muted, fontSize: 12 }}
          >
            {kindLabel(props.event.kind)}
          </Text>
          <Text
            selectable
            style={{
              color: essosTheme.color.muted,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {formatDateTime(props.event.startsAt)}
          </Text>
        </View>

        {props.event.location ? (
          <View
            style={{
              backgroundColor: essosTheme.color.panel,
              borderColor: essosTheme.color.line,
              borderCurve: "continuous",
              borderRadius: 14,
              borderWidth: 1,
              gap: 10,
              padding: compact ? 10 : 12,
            }}
          >
            <Text
              selectable
              style={{
                color: essosTheme.color.pearlSoft,
                fontSize: 14,
                fontWeight: "700",
                lineHeight: 18,
              }}
            >
              {props.event.location}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <ActionButton
                kind="subtle"
                label="Copy address"
                onPress={() => copyText(props.event.location ?? "")}
                size="compact"
              />
              <ActionButton
                kind="light"
                label="Open in Maps"
                onPress={() =>
                  openUrl(
                    `http://maps.apple.com/?q=${encodeURIComponent(
                      props.event.location ?? ""
                    )}`
                  )
                }
                size="compact"
              />
            </View>
          </View>
        ) : null}

        {props.event.confirmationNumber ? (
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: essosTheme.color.muted,
                fontSize: 13,
                fontWeight: "700",
                lineHeight: 18,
              }}
            >
              Confirmation
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => copyText(props.event.confirmationNumber ?? "")}
              style={({ pressed }) => ({
                backgroundColor: essosTheme.color.panel,
                borderColor: essosTheme.color.line,
                borderRadius: 8,
                borderWidth: 1,
                minHeight: 36,
                opacity: pressed ? 0.72 : 1,
                paddingHorizontal: 10,
                paddingVertical: 7,
              })}
            >
              <Text
                selectable
                style={{
                  color: essosTheme.color.pearl,
                  fontSize: 12,
                  fontVariant: ["tabular-nums"],
                  fontWeight: "900",
                  lineHeight: 16,
                }}
              >
                {props.event.confirmationNumber}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {props.event.detail ? (
          <Text
            selectable
            style={{
              color: essosTheme.color.muted,
              fontSize: 13,
              lineHeight: 19,
            }}
          >
            {props.event.detail}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {props.event.driverPhone ? (
            <ActionButton
              kind="primary"
              label="Call driver"
              onPress={() => openUrl(`tel:${props.event.driverPhone}`)}
              size="compact"
            />
          ) : null}
          <Link asChild href={`/p/${props.token}/event/${props.event.id}`}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: "transparent",
                borderColor: essosTheme.color.line,
                borderCurve: "continuous",
                borderRadius: 8,
                borderWidth: 1,
                justifyContent: "center",
                minHeight: 36,
                opacity: pressed ? 0.72 : 1,
                paddingHorizontal: 10,
              })}
            >
              <Text
                style={{
                  color: essosTheme.color.green,
                  fontSize: 12.5,
                  fontWeight: "800",
                }}
              >
                Source details
              </Text>
            </Pressable>
          </Link>
          {props.event.sourceDocumentId ? (
            <Link
              asChild
              href={
                patientDocumentRoute(
                  props.token,
                  props.event.sourceDocumentId
                ) as never
              }
            >
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => ({
                  alignItems: "center",
                  backgroundColor: "transparent",
                  borderColor: essosTheme.color.line,
                  borderCurve: "continuous",
                  borderRadius: 8,
                  borderWidth: 1,
                  justifyContent: "center",
                  minHeight: 36,
                  opacity: pressed ? 0.72 : 1,
                  paddingHorizontal: 10,
                })}
              >
                <Text
                  style={{
                    color: essosTheme.color.pearlSoft,
                    fontSize: 12.5,
                    fontWeight: "800",
                  }}
                >
                  Source doc
                </Text>
              </Pressable>
            </Link>
          ) : null}
        </View>
      </View>
    </View>
  );
}

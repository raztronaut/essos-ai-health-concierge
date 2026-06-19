import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import {
  ActionButton,
  copyText,
  openUrl,
  shareUrl,
} from "@/components/action-button";
import { patientDocumentRoute, patientDocumentUrl } from "@/lib/card-api";
import { documentKindLabel } from "@/lib/format";
import { essosTheme } from "@/lib/theme";
import type { PatientSourceDocument } from "@/lib/types";

export function SourceDocumentCard(props: {
  document: PatientSourceDocument;
  token: string;
}) {
  const viewUrl = patientDocumentUrl(props.token, props.document.id);
  const downloadUrl = patientDocumentUrl(props.token, props.document.id, {
    download: true,
  });
  const shareableUrl = viewUrl;
  return (
    <View
      style={{
        backgroundColor: essosTheme.color.panel,
        borderColor: essosTheme.color.line,
        borderCurve: "continuous",
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
        padding: 12,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text
          selectable
          style={{
            color: essosTheme.color.muted,
            fontSize: 12,
            fontWeight: "800",
            textTransform: "uppercase",
          }}
        >
          {documentKindLabel(props.document.kind)}
        </Text>
        <Text
          selectable
          style={{
            color: essosTheme.color.pearl,
            fontSize: 18,
            fontWeight: "800",
          }}
        >
          {props.document.title}
        </Text>
        <Text
          selectable
          style={{ color: essosTheme.color.muted, fontSize: 13 }}
        >
          {props.document.fileName ??
            (props.document.downloadable
              ? "Uploaded source file"
              : "Source file pending")}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Link
          asChild
          href={patientDocumentRoute(props.token, props.document.id) as never}
        >
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: essosTheme.color.pearl,
              borderColor: essosTheme.color.pearl,
              borderCurve: "continuous",
              borderRadius: 8,
              borderWidth: 1,
              justifyContent: "center",
              minHeight: 32,
              opacity: pressed ? 0.76 : 1,
              paddingHorizontal: 10,
            })}
          >
            <Text
              style={{
                color: essosTheme.color.background,
                fontSize: 12,
                fontWeight: "800",
              }}
            >
              View
            </Text>
          </Pressable>
        </Link>
        {props.document.downloadable ? (
          <>
            <ActionButton
              kind="subtle"
              label="Download"
              onPress={() => openUrl(downloadUrl)}
              size="compact"
            />
            <ActionButton
              kind="subtle"
              label="Share"
              onPress={() => shareUrl(shareableUrl)}
              size="compact"
            />
            <ActionButton
              kind="subtle"
              label="Copy link"
              onPress={() => copyText(shareableUrl)}
              size="compact"
            />
          </>
        ) : (
          <ActionButton
            kind="subtle"
            label="File pending"
            onPress={() => undefined}
            size="compact"
          />
        )}
      </View>
    </View>
  );
}

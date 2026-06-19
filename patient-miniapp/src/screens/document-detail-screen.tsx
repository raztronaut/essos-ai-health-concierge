import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  ActionButton,
  copyText,
  openUrl,
  shareUrl,
} from "@/components/action-button";
import { DataRow, InfoCard } from "@/components/info-card";
import { loadPatientCard, patientDocumentUrl } from "@/lib/card-api";
import { documentKindLabel } from "@/lib/format";
import { essosTheme } from "@/lib/theme";
import type { PatientCardPayload, PatientSourceDocument } from "@/lib/types";

export function DocumentDetailScreen(props: {
  documentId: string;
  token: string;
}) {
  const { width } = useWindowDimensions();
  const [payload, setPayload] = useState<PatientCardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const narrow = width < 430;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setPayload(null);
    loadPatientCard(props.token)
      .then((next) => {
        if (!cancelled) {
          setPayload(next);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [props.token]);

  const document = useMemo<PatientSourceDocument | null>(
    () =>
      payload?.documents.find((item) => item.id === props.documentId) ?? null,
    [payload, props.documentId]
  );

  if (error) {
    return (
      <Shell narrow={narrow}>
        <InfoCard eyebrow="Essos" title="Document unavailable">
          <Text
            selectable
            style={{ color: essosTheme.color.pearlSoft, fontSize: 16 }}
          >
            {error}
          </Text>
        </InfoCard>
      </Shell>
    );
  }

  if (!payload) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: essosTheme.color.background,
          flex: 1,
          gap: 12,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={essosTheme.color.green} />
        <Text selectable style={{ color: essosTheme.color.muted }}>
          Loading document...
        </Text>
      </View>
    );
  }

  if (!document) {
    return (
      <Shell narrow={narrow}>
        <InfoCard eyebrow="Essos" title="Document not found">
          <Text
            selectable
            style={{ color: essosTheme.color.pearlSoft, fontSize: 16 }}
          >
            This card link opened, but that document is not in the snapshot.
          </Text>
        </InfoCard>
      </Shell>
    );
  }

  const viewUrl = patientDocumentUrl(props.token, document.id);
  const downloadUrl = patientDocumentUrl(props.token, document.id, {
    download: true,
  });

  return (
    <Shell narrow={narrow}>
      <View style={{ gap: 8, paddingTop: narrow ? 10 : 22 }}>
        <Text
          selectable
          style={{
            color: essosTheme.color.muted,
            fontSize: 12,
            fontWeight: "800",
            textTransform: "uppercase",
          }}
        >
          {documentKindLabel(document.kind)}
        </Text>
        <Text
          selectable
          style={{
            color: essosTheme.color.pearl,
            fontFamily: essosTheme.font.display,
            fontSize: narrow ? 30 : 44,
            fontWeight: "800",
            lineHeight: narrow ? 35 : 50,
          }}
        >
          {document.title}
        </Text>
        <Text
          selectable
          style={{ color: essosTheme.color.muted, fontSize: 15 }}
        >
          Patient-facing source file from {payload.patient.firstName}'s Essos
          snapshot.
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {document.downloadable ? (
          <>
            <ActionButton
              kind="light"
              label="View file"
              onPress={() => openUrl(viewUrl)}
              size="compact"
            />
            <ActionButton
              kind="subtle"
              label="Download"
              onPress={() => openUrl(downloadUrl)}
              size="compact"
            />
            <ActionButton
              kind="subtle"
              label="Share"
              onPress={() => shareUrl(viewUrl)}
              size="compact"
            />
            <ActionButton
              kind="subtle"
              label="Copy link"
              onPress={() => copyText(viewUrl)}
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

      <InfoCard
        eyebrow={document.downloadable ? "File ready" : "File pending"}
        title={document.fileName ?? "Source record"}
      >
        <DataRow compact label="Document id" value={document.id} />
        <DataRow
          compact
          label="File type"
          value={document.contentType ?? "Not uploaded"}
        />
        <DataRow compact label="Source type" value={document.sourceType} />
        <DataRow compact label="Source status" value={document.sourceStatus} />
        <DataRow
          compact
          label="Related itinerary items"
          value={
            document.relatedEventIds.length > 0
              ? document.relatedEventIds.length.toString()
              : null
          }
        />
      </InfoCard>

      {document.downloadable ? null : (
        <InfoCard eyebrow="Essos" title="Upload needed" tone="warning">
          <Text
            selectable
            style={{ color: essosTheme.color.pearlSoft, fontSize: 15 }}
          >
            This source record is in the card snapshot, but the actual file has
            not been uploaded to patient-facing storage yet.
          </Text>
        </InfoCard>
      )}
    </Shell>
  );
}

function Shell(props: { children: React.ReactNode; narrow: boolean }) {
  return (
    <ScrollView
      contentContainerStyle={{
        alignItems: "center",
        backgroundColor: essosTheme.color.background,
        padding: props.narrow ? 14 : 28,
        paddingBottom: 48,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={{ gap: 20, maxWidth: props.narrow ? 430 : 560, width: "100%" }}>
        {props.children}
      </View>
    </ScrollView>
  );
}

import type React from "react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { InfoCard } from "@/components/info-card";
import { SourceDocumentCard } from "@/components/source-document-card";
import { loadPatientCard } from "@/lib/card-api";
import { essosTheme } from "@/lib/theme";
import type { PatientCardPayload } from "@/lib/types";

export function DocumentListScreen({ token }: { token: string }) {
  const { width } = useWindowDimensions();
  const [payload, setPayload] = useState<PatientCardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const narrow = width < 430;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setPayload(null);
    loadPatientCard(token)
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
  }, [token]);

  if (error) {
    return (
      <Shell narrow={narrow}>
        <InfoCard eyebrow="Essos" title="Documents unavailable">
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
          Loading source documents...
        </Text>
      </View>
    );
  }

  return (
    <Shell narrow={narrow}>
      <View style={{ gap: 8, paddingTop: narrow ? 10 : 22 }}>
        <Text
          selectable
          style={{
            color: essosTheme.color.pearl,
            fontFamily: essosTheme.font.display,
            fontSize: narrow ? 34 : 44,
            fontWeight: "800",
            lineHeight: narrow ? 40 : 50,
          }}
        >
          Source documents
        </Text>
        <Text
          selectable
          style={{ color: essosTheme.color.muted, fontSize: 15 }}
        >
          View, share, or download the files Essos used for{" "}
          {payload.patient.firstName}'s trip card.
        </Text>
      </View>

      {payload.documents.length > 0 ? (
        <View style={{ gap: 10 }}>
          {payload.documents.map((document) => (
            <SourceDocumentCard
              document={document}
              key={document.id}
              token={token}
            />
          ))}
        </View>
      ) : (
        <InfoCard eyebrow="Files" title="No source documents">
          <Text
            selectable
            style={{ color: essosTheme.color.pearlSoft, fontSize: 16 }}
          >
            This card snapshot does not include patient-facing source documents.
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
        padding: props.narrow ? 16 : 28,
        paddingBottom: 48,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={{ gap: 20, maxWidth: 520, width: "100%" }}>
        {props.children}
      </View>
    </ScrollView>
  );
}

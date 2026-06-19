import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { ActionButton, copyText, openUrl } from "@/components/action-button";
import { DataRow, InfoCard } from "@/components/info-card";
import { SourceDocumentCard } from "@/components/source-document-card";
import { loadPatientCard } from "@/lib/card-api";
import { formatDateTime, kindLabel, mapUrl } from "@/lib/format";
import { essosTheme } from "@/lib/theme";
import type { ItineraryEvent, PatientCardPayload } from "@/lib/types";

export function EventDetailScreen(props: { eventId: string; token: string }) {
  const { width } = useWindowDimensions();
  const [payload, setPayload] = useState<PatientCardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const narrow = width < 430;

  useEffect(() => {
    let cancelled = false;
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

  const event = useMemo<ItineraryEvent | null>(
    () => payload?.itinerary.find((item) => item.id === props.eventId) ?? null,
    [payload, props.eventId]
  );
  const sourceDocument = useMemo(
    () =>
      event?.sourceDocumentId
        ? (payload?.documents.find(
            (doc) => doc.id === event.sourceDocumentId
          ) ?? null)
        : null,
    [event?.sourceDocumentId, payload?.documents]
  );

  if (error) {
    return (
      <ScrollView
        contentContainerStyle={{
          alignItems: "center",
          backgroundColor: essosTheme.color.background,
          padding: 20,
        }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={{ maxWidth: 520, width: "100%" }}>
          <InfoCard eyebrow="Essos" title="Source unavailable">
            <Text
              selectable
              style={{ color: essosTheme.color.pearlSoft, fontSize: 16 }}
            >
              {error}
            </Text>
          </InfoCard>
        </View>
      </ScrollView>
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
          Loading source detail...
        </Text>
      </View>
    );
  }

  if (!event) {
    return (
      <ScrollView
        contentContainerStyle={{
          alignItems: "center",
          backgroundColor: essosTheme.color.background,
          padding: 20,
        }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={{ maxWidth: 520, width: "100%" }}>
          <InfoCard eyebrow="Essos" title="Event not found">
            <Text
              selectable
              style={{ color: essosTheme.color.pearlSoft, fontSize: 16 }}
            >
              This card link opened, but that itinerary item is not in the
              snapshot.
            </Text>
          </InfoCard>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        alignItems: "center",
        backgroundColor: essosTheme.color.background,
        padding: narrow ? 16 : 28,
        paddingBottom: 48,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={{ gap: 18, maxWidth: 520, width: "100%" }}>
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
            {kindLabel(event.kind)}
          </Text>
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
            {event.title}
          </Text>
          <Text
            selectable
            style={{ color: essosTheme.color.muted, fontSize: 15 }}
          >
            Source details from {payload.patient.firstName}'s Essos snapshot.
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {event.location ? (
            <ActionButton
              kind="light"
              label="Open in Maps"
              onPress={() => openUrl(mapUrl(event.location ?? ""))}
              size="compact"
            />
          ) : null}
          {event.confirmationNumber ? (
            <ActionButton
              kind="subtle"
              label="Copy code"
              onPress={() => copyText(event.confirmationNumber ?? "")}
              size="compact"
            />
          ) : null}
        </View>

        <InfoCard eyebrow="Timing" title="Schedule">
          <DataRow
            compact
            label="Starts"
            value={formatDateTime(event.startsAt)}
          />
          <DataRow
            compact
            label="Ends"
            value={event.endsAt ? formatDateTime(event.endsAt) : null}
          />
          <DataRow compact label="Location" value={event.location} />
        </InfoCard>

        <InfoCard eyebrow="Source data" title="Details">
          <DataRow compact label="Detail" value={event.detail} />
          <DataRow
            action={
              event.confirmationNumber ? (
                <ActionButton
                  kind="subtle"
                  label="Copy"
                  onPress={() => copyText(event.confirmationNumber ?? "")}
                  size="compact"
                />
              ) : null
            }
            compact
            label="Confirmation"
            value={event.confirmationNumber}
          />
          <DataRow compact label="Driver" value={event.driverName} />
          <DataRow
            action={
              event.driverPhone ? (
                <ActionButton
                  kind="primary"
                  label="Call"
                  onPress={() => openUrl(`tel:${event.driverPhone}`)}
                  size="compact"
                />
              ) : null
            }
            compact
            label="Driver phone"
            value={event.driverPhone}
          />
          <DataRow
            compact
            label="Source document"
            value={event.sourceDocumentId}
          />
        </InfoCard>

        {sourceDocument ? (
          <InfoCard eyebrow="File" title="Source document">
            <SourceDocumentCard document={sourceDocument} token={props.token} />
          </InfoCard>
        ) : null}
      </View>
    </ScrollView>
  );
}

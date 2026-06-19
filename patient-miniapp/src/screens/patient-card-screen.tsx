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
import { ItineraryCard } from "@/components/itinerary-card";
import { SourceDocumentCard } from "@/components/source-document-card";
import { cardApiUrl, loadPatientCard } from "@/lib/card-api";
import { formatDateTime, mapUrl, procedureLabel } from "@/lib/format";
import { essosTheme } from "@/lib/theme";
import type { PatientCardPayload } from "@/lib/types";

export function PatientCardScreen({ token }: { token: string }) {
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

  const currentUrl = useMemo(
    () => (token === "demo" ? "essos-patient://p/demo" : `/p/${token}`),
    [token]
  );

  if (error) {
    return (
      <ScrollView
        contentContainerStyle={{
          alignItems: "center",
          backgroundColor: essosTheme.color.background,
          gap: 16,
          padding: 20,
        }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={{ maxWidth: 520, width: "100%" }}>
          <InfoCard eyebrow="Essos" title="Card unavailable">
            <Text
              selectable
              style={{ color: essosTheme.color.pearlSoft, fontSize: 16 }}
            >
              {error}
            </Text>
            <Text
              selectable
              style={{ color: essosTheme.color.muted, fontSize: 13 }}
            >
              API: {cardApiUrl}
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
          Opening Essos card...
        </Text>
      </View>
    );
  }

  const confirmationNumbers = payload.itinerary
    .map((event) => event.confirmationNumber)
    .filter((value): value is string => Boolean(value));
  const firstUpcomingIndex = payload.itinerary.findIndex(
    (event) => eventTime(event.startsAt) >= eventTime(payload.generatedAt)
  );
  const activeIndex =
    firstUpcomingIndex === -1
      ? Math.max(0, payload.itinerary.length - 1)
      : firstUpcomingIndex;

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
      <View style={{ gap: 28, maxWidth: 520, width: "100%" }}>
        <View style={{ gap: 14, paddingTop: narrow ? 10 : 22 }}>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: "rgba(235, 228, 209, 0.05)",
              borderColor: essosTheme.color.line,
              borderRadius: 999,
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text
              selectable
              style={{
                color: essosTheme.color.muted,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Expires {formatDateTime(payload.expiresAt)}
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text
              selectable
              style={{
                color: essosTheme.color.pearl,
                fontFamily: essosTheme.font.display,
                fontSize: narrow ? 36 : 46,
                fontWeight: "800",
                lineHeight: narrow ? 42 : 52,
              }}
            >
              {payload.patient.firstName}'s Essos Trip
            </Text>
            <Text
              selectable
              style={{
                color: essosTheme.color.muted,
                fontSize: 15,
                lineHeight: 22,
                maxWidth: 430,
              }}
            >
              {procedureLabel(payload.patient.procedure)} itinerary for{" "}
              {payload.patient.destinationCity},{" "}
              {payload.patient.destinationCountry}. Tap any address or code to
              copy it.
            </Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <ActionButton
              kind="light"
              label="Share"
              onPress={() => shareUrl(currentUrl)}
              size="compact"
            />
            <ActionButton
              kind="subtle"
              label="Copy link"
              onPress={() => copyText(currentUrl)}
              size="compact"
            />
          </View>
        </View>

        <InfoCard eyebrow="Care anchors" title={payload.clinic.name}>
          <DataRow
            action={
              payload.clinic.phone ? (
                <ActionButton
                  kind="primary"
                  label="Call"
                  onPress={() => openUrl(`tel:${payload.clinic.phone}`)}
                  size="compact"
                />
              ) : null
            }
            compact
            label="Clinic phone"
            value={payload.clinic.phone}
          />
          <DataRow
            action={
              payload.clinic.address ? (
                <ActionButton
                  kind="light"
                  label="Maps"
                  onPress={() => openUrl(mapUrl(payload.clinic.address ?? ""))}
                  size="compact"
                />
              ) : null
            }
            compact
            label="Clinic address"
            value={payload.clinic.address}
          />
          <DataRow
            action={
              payload.hotel.address ? (
                <ActionButton
                  kind="light"
                  label="Maps"
                  onPress={() => openUrl(mapUrl(payload.hotel.address ?? ""))}
                  size="compact"
                />
              ) : null
            }
            compact
            label={`Hotel: ${payload.hotel.name}`}
            value={payload.hotel.address}
          />
          <DataRow
            action={
              payload.transport.driverPhone ? (
                <ActionButton
                  kind="primary"
                  label="Call"
                  onPress={() =>
                    openUrl(`tel:${payload.transport.driverPhone}`)
                  }
                  size="compact"
                />
              ) : null
            }
            compact
            label={`Driver: ${
              payload.transport.driverName ?? "Assigned driver"
            }`}
            value={payload.transport.driverPhone}
          />
        </InfoCard>

        <View style={{ gap: 2 }}>
          {payload.itinerary.map((event, index) => (
            <ItineraryCard
              event={event}
              index={index}
              isLast={index === payload.itinerary.length - 1}
              key={event.id}
              status={
                index < activeIndex
                  ? "completed"
                  : index === activeIndex
                    ? "current"
                    : "upcoming"
              }
              token={token}
            />
          ))}
        </View>

        {confirmationNumbers.length > 0 || payload.hotel.confirmationNumber ? (
          <InfoCard eyebrow="Copy desk" title="Confirmation codes">
            {payload.hotel.confirmationNumber ? (
              <DataRow
                action={
                  <ActionButton
                    kind="subtle"
                    label="Copy"
                    onPress={() =>
                      copyText(payload.hotel.confirmationNumber ?? "")
                    }
                    size="compact"
                  />
                }
                compact
                label="Hotel"
                value={payload.hotel.confirmationNumber}
              />
            ) : null}
            {confirmationNumbers.map((code) => (
              <DataRow
                action={
                  <ActionButton
                    kind="subtle"
                    label="Copy"
                    onPress={() => copyText(code)}
                    size="compact"
                  />
                }
                compact
                key={code}
                label="Itinerary"
                value={code}
              />
            ))}
          </InfoCard>
        ) : null}

        {payload.documents.length > 0 ? (
          <InfoCard eyebrow="Files" title="Source documents">
            {payload.documents.map((document) => (
              <SourceDocumentCard
                document={document}
                key={document.id}
                token={token}
              />
            ))}
          </InfoCard>
        ) : null}

        {payload.sources.length > 0 ? (
          <InfoCard eyebrow="Sources" title="Reference data" tone="quiet">
            {payload.sources.map((source) => (
              <Text
                key={source}
                selectable
                style={{ color: essosTheme.color.muted, fontSize: 14 }}
              >
                {source}
              </Text>
            ))}
          </InfoCard>
        ) : null}
      </View>
    </ScrollView>
  );
}

function eventTime(value: string | null): number {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

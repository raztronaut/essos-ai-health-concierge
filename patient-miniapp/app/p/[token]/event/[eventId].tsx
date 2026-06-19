import { useLocalSearchParams } from "expo-router";
import { EventDetailScreen } from "@/screens/event-detail-screen";

export default function EventDetailRoute() {
  const { eventId, token } = useLocalSearchParams<{
    eventId: string;
    token: string;
  }>();
  return <EventDetailScreen eventId={eventId ?? ""} token={token ?? "demo"} />;
}

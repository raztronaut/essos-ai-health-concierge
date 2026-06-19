import { useLocalSearchParams } from "expo-router";
import { DocumentDetailScreen } from "@/screens/document-detail-screen";

export default function DocumentDetailRoute() {
  const { documentId, token } = useLocalSearchParams<{
    documentId: string;
    token: string;
  }>();
  return (
    <DocumentDetailScreen
      documentId={documentId ?? ""}
      token={token ?? "demo"}
    />
  );
}

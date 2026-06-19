import { useLocalSearchParams } from "expo-router";
import { DocumentListScreen } from "@/screens/document-list-screen";

export default function DocumentListRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <DocumentListScreen token={token ?? "demo"} />;
}

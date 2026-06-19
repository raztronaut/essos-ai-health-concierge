import { useLocalSearchParams } from "expo-router";
import { PatientCardScreen } from "@/screens/patient-card-screen";

export default function PatientCardRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <PatientCardScreen token={token ?? "demo"} />;
}

import { Stack } from "expo-router";
import { essosTheme } from "@/lib/theme";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerBlurEffect: "dark",
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: essosTheme.color.background },
        headerTintColor: essosTheme.color.pearl,
        contentStyle: { backgroundColor: essosTheme.color.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Essos" }} />
      <Stack.Screen name="p/demo" options={{ headerShown: false }} />
      <Stack.Screen name="p/[token]/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="p/[token]/docs/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="p/[token]/docs/[documentId]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="p/[token]/event/[eventId]"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

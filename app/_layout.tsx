import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useFonts as useJakarta, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts as usePlex, IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium } from "@expo-google-fonts/ibm-plex-sans-arabic";
import { AuthProvider } from "../lib/auth";
import { colors } from "../lib/theme";

export default function RootLayout() {
  const [jakartaReady] = useJakarta({ PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold });
  const [plexReady] = usePlex({ IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium });

  // Wacht tot de Jawharaat-fonts geladen zijn voor een consistente look
  if (!jakartaReady || !plexReady) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="leerling" options={{ headerShown: false }} />
        <Stack.Screen name="docent" options={{ headerShown: false }} />
        <Stack.Screen name="ouder" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}

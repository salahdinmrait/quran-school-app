import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, ApiError } from "../lib/api";
import { Button, Input } from "../components/ui";
import { Logo } from "../components/Logo";
import { colors } from "../lib/theme";

// Scherm achter de link uit de welkomst- en wachtwoord-vergeten-mail.
// Zowel het instellen als het inloggen daarna gebeurt hier in de app.
export default function WachtwoordInstellenScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [wachtwoord, setWachtwoord] = useState("");
  const [herhaling, setHerhaling] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gelukt, setGelukt] = useState(false);

  async function handleOpslaan() {
    setError(null);
    if (wachtwoord.length < 8) {
      setError("Kies een wachtwoord van minimaal 8 tekens");
      return;
    }
    if (wachtwoord !== herhaling) {
      setError("De twee wachtwoorden zijn niet gelijk");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, nieuwWachtwoord: wachtwoord }),
      });
      setGelukt(true);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Er ging iets mis — probeer het opnieuw"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <Logo size={52} />
        </View>
        <Text style={styles.titel}>Wachtwoord instellen</Text>

        {!token ? (
          <>
            <Text style={styles.uitleg}>
              Deze link is niet compleet. Vraag een nieuwe link aan; die is een uur geldig.
            </Text>
            <Button
              title="Nieuwe link aanvragen"
              onPress={() => router.replace("/wachtwoord-vergeten")}
            />
          </>
        ) : gelukt ? (
          <>
            <Text style={styles.uitleg}>
              Je wachtwoord is opgeslagen. Log in met je e-mailadres en je nieuwe wachtwoord.
            </Text>
            <Button title="Naar inloggen" onPress={() => router.replace("/login")} />
          </>
        ) : (
          <>
            <Text style={styles.uitleg}>
              Kies een eigen wachtwoord van minimaal 8 tekens. Daarmee log je voortaan in.
            </Text>

            <Input
              label="Nieuw wachtwoord"
              value={wachtwoord}
              onChangeText={setWachtwoord}
              placeholder="••••••••"
              secureTextEntry
            />
            <Input
              label="Herhaal wachtwoord"
              value={herhaling}
              onChangeText={setHerhaling}
              placeholder="••••••••"
              secureTextEntry
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              title="Wachtwoord opslaan"
              onPress={handleOpslaan}
              loading={loading}
              disabled={!wachtwoord || !herhaling}
            />

            <Pressable onPress={() => router.replace("/login")}>
              <Text style={styles.terugLink}>Terug naar inloggen</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  inner: { padding: 24 },
  logoWrap: { alignSelf: "center", marginBottom: 10 },
  titel: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  uitleg: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  error: { color: colors.danger, marginBottom: 8, textAlign: "center" },
  terugLink: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 18,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

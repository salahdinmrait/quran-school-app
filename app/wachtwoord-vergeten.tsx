import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { api, ApiError } from "../lib/api";
import { Button, Input } from "../components/ui";
import { Logo } from "../components/Logo";
import { colors } from "../lib/theme";

export default function WachtwoordVergetenScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verstuurd, setVerstuurd] = useState(false);

  async function handleVerstuur() {
    setError(null);
    setLoading(true);
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setVerstuurd(true);
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
        <Text style={styles.titel}>Wachtwoord vergeten</Text>

        {verstuurd ? (
          <>
            <Text style={styles.uitleg}>
              Als dit e-mailadres bij ons bekend is, is er een e-mail verstuurd met een
              link om een nieuw wachtwoord in te stellen. Controleer ook je spam-map.
            </Text>
            <Button title="Terug naar inloggen" onPress={() => router.replace("/login")} />
          </>
        ) : (
          <>
            <Text style={styles.uitleg}>
              Vul het e-mailadres van je schoolaccount in. Je ontvangt dan een e-mail met
              een link om een nieuw wachtwoord in te stellen.
            </Text>

            <Input
              label="E-mailadres"
              value={email}
              onChangeText={setEmail}
              placeholder="naam@school.nl"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              title="Verstuur e-mail"
              onPress={handleVerstuur}
              loading={loading}
              disabled={!email.trim()}
            />

            <Pressable onPress={() => router.back()}>
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

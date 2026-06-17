import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { Button, Input } from "../components/ui";
import { Logo } from "../components/Logo";
import { colors } from "../lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Inloggen mislukt");
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
        <Text style={styles.appSubtitle}>Log in met je schoolaccount</Text>

        <Input
          label="E-mailadres"
          value={email}
          onChangeText={setEmail}
          placeholder="naam@school.nl"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Wachtwoord"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          title="Inloggen"
          onPress={handleLogin}
          loading={loading}
          disabled={!email || !password}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  inner: { padding: 24 },
  logoWrap: { alignSelf: "center", marginBottom: 10 },
  appSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 28,
  },
  error: { color: colors.danger, marginBottom: 8, textAlign: "center" },
});

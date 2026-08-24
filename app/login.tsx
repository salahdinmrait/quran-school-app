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
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { Button, Input } from "../components/ui";
import { Logo } from "../components/Logo";
import { LanguageButton } from "../components/LanguageButton";
import { colors } from "../lib/theme";
import { useT } from "../lib/LanguageContext";

export default function LoginScreen() {
  const router = useRouter();
  const { t, isRTL } = useT();
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
      setError(e instanceof ApiError ? e.message : t("login_mislukt"));
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
        <View style={[styles.taalRij, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
          <LanguageButton />
        </View>
        <View style={styles.logoWrap}>
          <Logo size={52} />
        </View>
        <Text style={styles.appSubtitle}>{t("login_sub")}</Text>

        <Input
          label={t("c_emailadres")}
          value={email}
          onChangeText={setEmail}
          placeholder={t("login_email_ph")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label={t("c_wachtwoord")}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          title={t("login_knop")}
          onPress={handleLogin}
          loading={loading}
          disabled={!email || !password}
        />

        <Pressable onPress={() => router.push("/wachtwoord-vergeten")}>
          <Text style={styles.vergetenLink}>{t("login_vergeten")}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  inner: { padding: 24 },
  taalRij: { marginBottom: 4 },
  logoWrap: { alignSelf: "center", marginBottom: 10 },
  appSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 28,
  },
  error: { color: colors.danger, marginBottom: 8, textAlign: "center" },
  vergetenLink: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 18,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

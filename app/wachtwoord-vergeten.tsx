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
import { LanguageButton } from "../components/LanguageButton";
import { colors } from "../lib/theme";
import { useT } from "../lib/LanguageContext";

export default function WachtwoordVergetenScreen() {
  const router = useRouter();
  const { t, isRTL } = useT();
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
      setError(e instanceof ApiError ? e.message : t("c_fout_opnieuw"));
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
        <Text style={styles.titel}>{t("ww_vergeten_titel")}</Text>

        {verstuurd ? (
          <>
            <Text style={styles.uitleg}>{t("ww_vergeten_verstuurd")}</Text>
            <Button title={t("ww_terug_inloggen")} onPress={() => router.replace("/login")} />
          </>
        ) : (
          <>
            <Text style={styles.uitleg}>{t("ww_vergeten_uitleg")}</Text>

            <Input
              label={t("c_emailadres")}
              value={email}
              onChangeText={setEmail}
              placeholder={t("login_email_ph")}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              title={t("ww_verstuur_email")}
              onPress={handleVerstuur}
              loading={loading}
              disabled={!email.trim()}
            />

            <Pressable onPress={() => router.back()}>
              <Text style={styles.terugLink}>{t("ww_terug_inloggen")}</Text>
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
  taalRij: { marginBottom: 4 },
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

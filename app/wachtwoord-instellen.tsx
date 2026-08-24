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
import { LanguageButton } from "../components/LanguageButton";
import { colors } from "../lib/theme";
import { useT } from "../lib/LanguageContext";

// Scherm achter de link uit de welkomst- en wachtwoord-vergeten-mail.
// Zowel het instellen als het inloggen daarna gebeurt hier in de app.
export default function WachtwoordInstellenScreen() {
  const router = useRouter();
  const { t, isRTL } = useT();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [wachtwoord, setWachtwoord] = useState("");
  const [herhaling, setHerhaling] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gelukt, setGelukt] = useState(false);

  async function handleOpslaan() {
    setError(null);
    if (wachtwoord.length < 8) {
      setError(t("ww_te_kort"));
      return;
    }
    if (wachtwoord !== herhaling) {
      setError(t("ww_niet_gelijk"));
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
        <Text style={styles.titel}>{t("ww_instellen_titel")}</Text>

        {!token ? (
          <>
            <Text style={styles.uitleg}>{t("ww_link_incompleet")}</Text>
            <Button
              title={t("ww_nieuwe_link")}
              onPress={() => router.replace("/wachtwoord-vergeten")}
            />
          </>
        ) : gelukt ? (
          <>
            <Text style={styles.uitleg}>{t("ww_gelukt")}</Text>
            <Button title={t("ww_naar_inloggen")} onPress={() => router.replace("/login")} />
          </>
        ) : (
          <>
            <Text style={styles.uitleg}>{t("ww_kies_uitleg")}</Text>

            <Input
              label={t("ww_nieuw")}
              value={wachtwoord}
              onChangeText={setWachtwoord}
              placeholder="••••••••"
              secureTextEntry
            />
            <Input
              label={t("ww_herhaal")}
              value={herhaling}
              onChangeText={setHerhaling}
              placeholder="••••••••"
              secureTextEntry
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              title={t("ww_opslaan")}
              onPress={handleOpslaan}
              loading={loading}
              disabled={!wachtwoord || !herhaling}
            />

            <Pressable onPress={() => router.replace("/login")}>
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

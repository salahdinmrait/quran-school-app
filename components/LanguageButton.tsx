import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useT, TALEN } from "../lib/LanguageContext";
import { colors, fonts, radius } from "../lib/theme";

// De taalschakelaar. Staat in de header naast de uitlogknop (voor elke rol
// bereikbaar) en los op de inlogschermen, zodat iemand die geen Nederlands
// leest ook binnenkomt.
export function LanguageButton() {
  const { lang, setLang, t, isRTL } = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={styles.knop} accessibilityLabel={t("c_taal")}>
        <Ionicons name="globe-outline" size={20} color={colors.textMuted} />
        <Text style={styles.knopText}>{TALEN.find((x) => x.code === lang)?.label ?? "NL"}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={[styles.paneel, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
            <Text style={[styles.kop, { textAlign: isRTL ? "right" : "left" }]}>{t("c_taal")}</Text>
            {TALEN.map((taal) => (
              <Pressable
                key={taal.code}
                onPress={() => {
                  setLang(taal.code);
                  setOpen(false);
                }}
                style={[styles.rij, taal.code === lang && styles.rijActief]}
              >
                <Text style={[styles.rijText, taal.code === lang && styles.rijTextActief]}>{taal.label}</Text>
                {taal.code === lang && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  knop: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4 },
  knopText: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.bodyMedium },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "center", padding: 32 },
  paneel: {
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 4,
    alignSelf: "center",
    minWidth: 220,
  },
  kop: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.bodyMedium, marginBottom: 4, alignSelf: "stretch" },
  rij: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radius.button,
    alignSelf: "stretch",
  },
  rijActief: { backgroundColor: colors.primaryLight },
  rijText: { fontSize: 16, color: colors.text, fontFamily: fonts.body },
  rijTextActief: { color: colors.primary, fontFamily: fonts.bodyMedium },
});

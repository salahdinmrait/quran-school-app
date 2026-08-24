import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFetch } from "../../lib/useFetch";
import { useT } from "../../lib/LanguageContext";
import { row, textStart, dirIcon } from "../../lib/rtl";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty } from "../../components/ui";
import { colors } from "../../lib/theme";

export interface DocentKlas {
  id: string;
  naam: string;
  vakken: { id: string; naam: string; categorie: string }[];
  leerlingen: { id: string; name: string; email: string }[];
  ouders: { id: string; name: string; email: string; kindNaam: string }[];
}

export default function DocentKlassen() {
  const router = useRouter();
  const { t, tel, isRTL, label } = useT();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<DocentKlas[]>("/api/docent/klassen");
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const klassen = data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {klassen.length === 0 ? (
        <Empty text={t("dk_geen_klas")} />
      ) : (
        klassen.map((k) => {
          const expanded = openId === k.id;
          return (
            <Card key={k.id} onPress={() => setOpenId(expanded ? null : k.id)}>
              <Text style={[styles.title, { textAlign: textStart(isRTL) }]}>{k.naam}</Text>
              <Muted>
                {tel("c_n_leerlingen", k.leerlingen.length)} · {tel("c_n_vakken", k.vakken.length)}
              </Muted>
              <View style={[styles.badges, { flexDirection: row(isRTL) }]}>
                {k.vakken.map((v) => (
                  <Badge key={v.id} text={label("categorie", v.categorie)} />
                ))}
              </View>

              {expanded && (
                <View style={styles.detail}>
                  <Text style={[styles.subTitle, { textAlign: textStart(isRTL) }]}>{t("c_leerlingen")}</Text>
                  {k.leerlingen.length === 0 ? (
                    <Muted>{t("dk_geen_leerlingen")}</Muted>
                  ) : (
                    k.leerlingen.map((l) => (
                      <Pressable
                        key={l.id}
                        style={({ pressed }) => [styles.leerlingRow, { flexDirection: row(isRTL) }, pressed && { opacity: 0.6 }]}
                        onPress={() => router.push(`/docent/leerling-dossier?leerlingId=${l.id}&naam=${encodeURIComponent(l.name)}`)}
                      >
                        <Text style={[styles.personRow, { textAlign: textStart(isRTL) }]}>{l.name}</Text>
                        <View style={[styles.dossierHint, { flexDirection: row(isRTL) }]}>
                          <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                          <Text style={styles.dossierHintText}>{t("c_dossier")}</Text>
                          <Ionicons name={dirIcon("chevron-forward", isRTL)} size={14} color={colors.textFaint} />
                        </View>
                      </Pressable>
                    ))
                  )}
                  <Text style={[styles.subTitle, { textAlign: textStart(isRTL) }]}>{t("c_ouders")}</Text>
                  {k.ouders.length === 0 ? (
                    <Muted>{t("dk_geen_ouders")}</Muted>
                  ) : (
                    k.ouders.map((o) => (
                      <Text key={o.id} style={[styles.personRow, { textAlign: textStart(isRTL) }]}>
                        • {o.name} <Text style={styles.kindNaam}>{t("dk_ouder_van", { naam: o.kindNaam })}</Text>
                      </Text>
                    ))
                  )}
                </View>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  badges: { flexWrap: "wrap", gap: 6, marginTop: 8 },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  subTitle: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: 8, marginBottom: 4 },
  personRow: { fontSize: 14, color: colors.text, paddingVertical: 2 },
  leerlingRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dossierHint: { alignItems: "center", gap: 3 },
  dossierHintText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  kindNaam: { color: colors.textMuted, fontSize: 13 },
});

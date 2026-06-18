import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty } from "../../components/ui";
import { colors, CATEGORIE_LABELS } from "../../lib/theme";
import { plural } from "../../lib/format";

export interface DocentKlas {
  id: string;
  naam: string;
  vakken: { id: string; naam: string; categorie: string }[];
  leerlingen: { id: string; name: string }[];
  ouders: { id: string; name: string; kindNaam: string }[];
}

export default function DocentKlassen() {
  const router = useRouter();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<DocentKlas[]>("/api/docent/klassen");
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const klassen = data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {klassen.length === 0 ? (
        <Empty text="Je bent nog niet aan een klas gekoppeld. Vraag de beheerder om je toe te voegen." />
      ) : (
        klassen.map((k) => {
          const expanded = openId === k.id;
          return (
            <Card key={k.id} onPress={() => setOpenId(expanded ? null : k.id)}>
              <Text style={styles.title}>{k.naam}</Text>
              <Muted>
                {plural(k.leerlingen.length, "leerling", "leerlingen")} · {plural(k.vakken.length, "vak", "vakken")}
              </Muted>
              <View style={styles.badges}>
                {k.vakken.map((v) => (
                  <Badge key={v.id} text={CATEGORIE_LABELS[v.categorie] ?? v.naam} />
                ))}
              </View>

              {expanded && (
                <View style={styles.detail}>
                  <Text style={styles.subTitle}>Leerlingen</Text>
                  {k.leerlingen.length === 0 ? (
                    <Muted>Geen leerlingen.</Muted>
                  ) : (
                    k.leerlingen.map((l) => (
                      <Pressable
                        key={l.id}
                        style={({ pressed }) => [styles.leerlingRow, pressed && { opacity: 0.6 }]}
                        onPress={() => router.push(`/docent/leerling-dossier?leerlingId=${l.id}&naam=${encodeURIComponent(l.name)}`)}
                      >
                        <Text style={styles.personRow}>{l.name}</Text>
                        <View style={styles.dossierHint}>
                          <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                          <Text style={styles.dossierHintText}>Dossier</Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
                        </View>
                      </Pressable>
                    ))
                  )}
                  <Text style={styles.subTitle}>Ouders</Text>
                  {k.ouders.length === 0 ? (
                    <Muted>Geen gekoppelde ouders.</Muted>
                  ) : (
                    k.ouders.map((o) => (
                      <Text key={o.id} style={styles.personRow}>
                        • {o.name} <Text style={styles.kindNaam}>(ouder van {o.kindNaam})</Text>
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
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  subTitle: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: 8, marginBottom: 4 },
  personRow: { fontSize: 14, color: colors.text, paddingVertical: 2 },
  leerlingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dossierHint: { flexDirection: "row", alignItems: "center", gap: 3 },
  dossierHintText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  kindNaam: { color: colors.textMuted, fontSize: 13 },
});

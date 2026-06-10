import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, MenuTile, SectionTitle } from "../../components/ui";
import { colors, STATUS_LABELS, STATUS_COLORS } from "../../lib/theme";
import { fmtDatum } from "../../lib/format";

export interface OuderKind {
  id: string;
  name: string;
  leerlingKlassen: {
    klas: {
      id: string;
      naam: string;
      docenten: { docent: { id: string; name: string } }[];
    };
  }[];
  cijfers: { id: string; waarde: number; datum: string; vak: { naam: string } }[];
  aanwezigheid: {
    id: string;
    status: string;
    les: { datum: string; klas: { naam: string } };
  }[];
  hifdhProfiel: {
    huidigeSurahNr: number;
    huidigeAyahNr: number;
    taken: { voltooid: boolean }[];
  } | null;
}

export default function OuderHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<OuderKind[]>("/api/ouder/kind");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const kinderen = data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Text style={styles.greeting}>Assalamu alaykum,</Text>
      <Text style={styles.name}>{user?.name}</Text>
      <View style={{ height: 16 }} />

      <View style={styles.tiles}>
        <MenuTile icon="book-outline" title="Huiswerk" subtitle="Per kind" onPress={() => router.push("/ouder/huiswerk")} />
        <MenuTile icon="calendar-outline" title="Rooster" subtitle="Lessen & aanwezigheid" onPress={() => router.push("/ouder/rooster")} />
        <MenuTile icon="mail-outline" title="Berichten" subtitle="Contact met docent" onPress={() => router.push("/ouder/berichten")} />
        <MenuTile icon="moon-outline" title="Hifdh" subtitle="Memorisatie-voortgang" onPress={() => router.push("/ouder/hifdh")} />
      </View>

      {kinderen.length === 0 ? (
        <Empty text="Er zijn nog geen kinderen aan uw account gekoppeld. Neem contact op met de school." />
      ) : (
        kinderen.map((kind) => {
          const recenteCijfers = kind.cijfers.slice(0, 3);
          const recenteAanw = kind.aanwezigheid.slice(0, 3);
          const aanwezigCount = kind.aanwezigheid.filter((a) => a.status === "AANWEZIG").length;
          const pct =
            kind.aanwezigheid.length > 0
              ? Math.round((aanwezigCount / kind.aanwezigheid.length) * 100)
              : null;
          const gem =
            kind.cijfers.length > 0
              ? (kind.cijfers.reduce((s, c) => s + c.waarde, 0) / kind.cijfers.length).toFixed(1)
              : null;

          return (
            <View key={kind.id}>
              <SectionTitle>{kind.name}</SectionTitle>
              <Card>
                <Muted>
                  {kind.leerlingKlassen.map((kk) => kk.klas.naam).join(", ") || "Nog geen klas"}
                  {kind.leerlingKlassen[0]?.klas.docenten.length
                    ? ` · docent: ${kind.leerlingKlassen[0].klas.docenten.map((d) => d.docent.name).join(", ")}`
                    : ""}
                </Muted>
                <View style={styles.statRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{gem ?? "—"}</Text>
                    <Muted>gemiddeld</Muted>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{pct != null ? `${pct}%` : "—"}</Text>
                    <Muted>aanwezig</Muted>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>
                      {kind.hifdhProfiel
                        ? `${kind.hifdhProfiel.taken.filter((t) => t.voltooid).length}/${kind.hifdhProfiel.taken.length}`
                        : "—"}
                    </Text>
                    <Muted>hifdh-taken</Muted>
                  </View>
                </View>
              </Card>

              {recenteCijfers.length > 0 && (
                <Card>
                  <Text style={styles.cardSub}>Recente cijfers</Text>
                  {recenteCijfers.map((c) => (
                    <View key={c.id} style={styles.cijferRow}>
                      <Muted>
                        {c.vak.naam} · {fmtDatum(c.datum)}
                      </Muted>
                      <Badge
                        text={c.waarde.toFixed(1)}
                        bg={c.waarde >= 5.5 ? colors.successLight : colors.dangerLight}
                        fg={c.waarde >= 5.5 ? colors.primaryDark : colors.danger}
                      />
                    </View>
                  ))}
                </Card>
              )}

              {recenteAanw.length > 0 && (
                <Card>
                  <Text style={styles.cardSub}>Recente aanwezigheid</Text>
                  {recenteAanw.map((a) => {
                    const c = STATUS_COLORS[a.status] ?? STATUS_COLORS.AANWEZIG;
                    return (
                      <View key={a.id} style={styles.cijferRow}>
                        <Muted>
                          {a.les.klas.naam} · {fmtDatum(a.les.datum)}
                        </Muted>
                        <Badge text={STATUS_LABELS[a.status] ?? a.status} bg={c.bg} fg={c.fg} />
                      </View>
                    );
                  })}
                </Card>
              )}
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 15, color: colors.textMuted },
  name: { fontSize: 24, fontWeight: "700", color: colors.text },
  tiles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statRow: { flexDirection: "row", marginTop: 10 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: colors.primaryDark },
  cardSub: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  cijferRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
});

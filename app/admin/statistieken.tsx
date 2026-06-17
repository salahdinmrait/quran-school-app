import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, SectionTitle } from "../../components/ui";
import { colors, CATEGORIE_LABELS } from "../../lib/theme";

interface KlasStat {
  id: string;
  naam: string;
  leerlingenCount: number;
  aanwezigheid: number | null;
  avgCijfer: number | null;
  hwPercent: number | null;
}
interface VakStat {
  id: string;
  naam: string;
  categorie: string;
  aanwezigheid: number | null;
  avgCijfer: number | null;
  hwPercent: number | null;
}
interface DocentStat {
  id: string;
  naam: string;
  klassen: number;
  aanwezigheid: number | null;
  avgCijfer: number | null;
  hwPercent: number | null;
}
interface Statistieken {
  totalen: { leerlingen: number; docenten: number; klassen: number; vakken: number };
  perKlas: KlasStat[];
  perVak: VakStat[];
  perDocent: DocentStat[];
  vakkenPerCategorie: { categorie: string; aantal: number }[];
}

function pctKleur(p: number, grens: [number, number]): { bg: string; fg: string } {
  if (p >= grens[0]) return { bg: colors.successLight, fg: colors.primaryDark };
  if (p >= grens[1]) return { bg: colors.warningLight, fg: colors.warning };
  return { bg: colors.dangerLight, fg: colors.danger };
}

function StatBadges({ aanwezigheid, avgCijfer, hwPercent }: { aanwezigheid: number | null; avgCijfer: number | null; hwPercent: number | null }) {
  return (
    <View style={styles.badgeRow}>
      {aanwezigheid !== null ? (
        <Badge text={`Aanwezig ${aanwezigheid}%`} {...pctKleur(aanwezigheid, [80, 60])} />
      ) : (
        <Badge text="Aanwezig —" bg={colors.bg} fg={colors.textFaint} />
      )}
      {avgCijfer !== null ? (
        <Badge text={`Gem. ${avgCijfer.toFixed(1)}`} {...pctKleur(avgCijfer, [5.5, 4])} />
      ) : (
        <Badge text="Cijfer —" bg={colors.bg} fg={colors.textFaint} />
      )}
      {hwPercent !== null ? (
        <Badge text={`Huiswerk ${hwPercent}%`} {...pctKleur(hwPercent, [70, 40])} />
      ) : (
        <Badge text="Huiswerk —" bg={colors.bg} fg={colors.textFaint} />
      )}
    </View>
  );
}

export default function AdminStatistieken() {
  const { data, error, loading, refreshing, refresh, reload } =
    useFetch<Statistieken>("/api/admin/statistieken");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Empty text="Geen statistieken beschikbaar." />;

  const t = data.totalen;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {/* Totalen */}
      <View style={styles.statGrid}>
        {[
          { label: "Leerlingen", value: t.leerlingen },
          { label: "Docenten", value: t.docenten },
          { label: "Klassen", value: t.klassen },
          { label: "Vakken", value: t.vakken },
        ].map((s) => (
          <View key={s.label} style={styles.statBox}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Per klas */}
      <SectionTitle>Per klas</SectionTitle>
      {data.perKlas.length === 0 ? (
        <Empty text="Nog geen klassen." />
      ) : (
        data.perKlas.map((k) => (
          <Card key={k.id}>
            <Text style={styles.klasNaam}>{k.naam}</Text>
            <Muted>{k.leerlingenCount} leerlingen</Muted>
            <StatBadges aanwezigheid={k.aanwezigheid} avgCijfer={k.avgCijfer} hwPercent={k.hwPercent} />
          </Card>
        ))
      )}

      {/* Per vak */}
      <SectionTitle>Per vak</SectionTitle>
      {(data.perVak ?? []).length === 0 ? (
        <Empty text="Nog geen vakken." />
      ) : (
        data.perVak.map((v) => (
          <Card key={v.id}>
            <View style={styles.catRow2}>
              <Text style={styles.klasNaam}>{v.naam}</Text>
              <Badge text={CATEGORIE_LABELS[v.categorie] ?? v.categorie} />
            </View>
            <StatBadges aanwezigheid={v.aanwezigheid} avgCijfer={v.avgCijfer} hwPercent={v.hwPercent} />
          </Card>
        ))
      )}

      {/* Per docent */}
      <SectionTitle>Per docent</SectionTitle>
      {(data.perDocent ?? []).length === 0 ? (
        <Empty text="Nog geen docenten." />
      ) : (
        data.perDocent.map((d) => (
          <Card key={d.id}>
            <Text style={styles.klasNaam}>{d.naam}</Text>
            <Muted>{d.klassen} klas{d.klassen === 1 ? "" : "sen"}</Muted>
            <StatBadges aanwezigheid={d.aanwezigheid} avgCijfer={d.avgCijfer} hwPercent={d.hwPercent} />
          </Card>
        ))
      )}

      {/* Vakken per categorie */}
      <SectionTitle>Vakken per categorie</SectionTitle>
      {data.vakkenPerCategorie.length === 0 ? (
        <Empty text="Nog geen vakken." />
      ) : (
        <Card>
          {data.vakkenPerCategorie.map((c) => (
            <View key={c.categorie} style={styles.catRow}>
              <Badge text={CATEGORIE_LABELS[c.categorie] ?? c.categorie} />
              <Text style={styles.catAantal}>
                {c.aantal} vak{c.aantal === 1 ? "" : "ken"}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    width: "48%" as unknown as number,
    marginBottom: 12,
    alignItems: "center",
  },
  statValue: { fontSize: 26, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  klasNaam: { fontSize: 15, fontWeight: "600", color: colors.text },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  catAantal: { fontSize: 14, color: colors.text, fontWeight: "500" },
  catRow2: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
});

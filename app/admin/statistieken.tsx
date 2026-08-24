import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, SectionTitle } from "../../components/ui";
import { colors } from "../../lib/theme";
import { useT } from "../../lib/LanguageContext";
import { row } from "../../lib/rtl";

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
  const { t, isRTL } = useT();
  return (
    <View style={[styles.badgeRow, { flexDirection: row(isRTL) }]}>
      {aanwezigheid !== null ? (
        <Badge text={t("as_aanwezig_pct", { pct: aanwezigheid })} {...pctKleur(aanwezigheid, [80, 60])} />
      ) : (
        <Badge text={t("as_aanwezig_leeg")} bg={colors.bg} fg={colors.textFaint} />
      )}
      {avgCijfer !== null ? (
        <Badge text={t("as_gem", { waarde: avgCijfer.toFixed(1) })} {...pctKleur(avgCijfer, [5.5, 4])} />
      ) : (
        <Badge text={t("as_cijfer_leeg")} bg={colors.bg} fg={colors.textFaint} />
      )}
      {hwPercent !== null ? (
        <Badge text={t("as_hw_pct", { pct: hwPercent })} {...pctKleur(hwPercent, [70, 40])} />
      ) : (
        <Badge text={t("as_hw_leeg")} bg={colors.bg} fg={colors.textFaint} />
      )}
    </View>
  );
}

export default function AdminStatistieken() {
  const { t, tel, isRTL, label } = useT();
  const { data, error, loading, refreshing, refresh, reload } =
    useFetch<Statistieken>("/api/admin/statistieken");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Empty text={t("as_geen")} />;

  const tot = data.totalen;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {/* Totalen */}
      <View style={styles.statGrid}>
        {[
          { label: t("c_leerlingen"), value: tot.leerlingen },
          { label: t("c_docenten"), value: tot.docenten },
          { label: t("c_klassen"), value: tot.klassen },
          { label: t("c_vakken"), value: tot.vakken },
        ].map((s) => (
          <View key={s.label} style={styles.statBox}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Per klas */}
      <SectionTitle>{t("c_per_klas")}</SectionTitle>
      {data.perKlas.length === 0 ? (
        <Empty text={t("ak_geen_klassen")} />
      ) : (
        data.perKlas.map((k) => (
          <Card key={k.id}>
            <Text style={styles.klasNaam}>{k.naam}</Text>
            <Muted>{tel("c_n_leerlingen", k.leerlingenCount)}</Muted>
            <StatBadges aanwezigheid={k.aanwezigheid} avgCijfer={k.avgCijfer} hwPercent={k.hwPercent} />
          </Card>
        ))
      )}

      {/* Per vak */}
      <SectionTitle>{t("c_per_vak")}</SectionTitle>
      {(data.perVak ?? []).length === 0 ? (
        <Empty text={t("av_geen")} />
      ) : (
        data.perVak.map((v) => (
          <Card key={v.id}>
            <View style={[styles.catRow2, { flexDirection: row(isRTL) }]}>
              <Text style={styles.klasNaam}>{v.naam}</Text>
              <Badge text={label("categorie", v.categorie)} />
            </View>
            <StatBadges aanwezigheid={v.aanwezigheid} avgCijfer={v.avgCijfer} hwPercent={v.hwPercent} />
          </Card>
        ))
      )}

      {/* Per docent */}
      <SectionTitle>{t("c_per_docent")}</SectionTitle>
      {(data.perDocent ?? []).length === 0 ? (
        <Empty text={t("as_geen_docenten")} />
      ) : (
        data.perDocent.map((d) => (
          <Card key={d.id}>
            <Text style={styles.klasNaam}>{d.naam}</Text>
            <Muted>{tel("c_n_klassen", d.klassen)}</Muted>
            <StatBadges aanwezigheid={d.aanwezigheid} avgCijfer={d.avgCijfer} hwPercent={d.hwPercent} />
          </Card>
        ))
      )}

      {/* Vakken per categorie */}
      <SectionTitle>{t("as_vakken_per_cat")}</SectionTitle>
      {data.vakkenPerCategorie.length === 0 ? (
        <Empty text={t("av_geen")} />
      ) : (
        <Card>
          {data.vakkenPerCategorie.map((c) => (
            <View key={c.categorie} style={[styles.catRow, { flexDirection: row(isRTL) }]}>
              <Badge text={label("categorie", c.categorie)} />
              <Text style={styles.catAantal}>{tel("c_n_vakken", c.aantal)}</Text>
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
  badgeRow: { flexWrap: "wrap", gap: 6, marginTop: 8 },
  catRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  catAantal: { fontSize: 14, color: colors.text, fontWeight: "500" },
  catRow2: { alignItems: "center", justifyContent: "space-between", gap: 8 },
});

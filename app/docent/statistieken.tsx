import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { useT } from "../../lib/LanguageContext";
import { row, textStart } from "../../lib/rtl";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, SectionTitle } from "../../components/ui";
import { colors } from "../../lib/theme";

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
  avgCijfer: number | null;
  hwPercent: number | null;
}
interface Stats {
  totalen: { klassen: number; leerlingen: number; vakken: number };
  perKlas: KlasStat[];
  perVak: VakStat[];
}

function pctKleur(p: number, grens: [number, number]) {
  if (p >= grens[0]) return { bg: colors.successLight, fg: colors.primaryDark };
  if (p >= grens[1]) return { bg: colors.warningLight, fg: colors.warning };
  return { bg: colors.dangerLight, fg: colors.danger };
}

function StatBadge({ label, value, soort }: { label: string; value: number | null; soort: "pct" | "cijfer" | "hw" }) {
  if (value === null) return <Badge text={`${label} —`} bg={colors.bg} fg={colors.textFaint} />;
  const kleur = soort === "cijfer" ? pctKleur(value, [5.5, 4]) : soort === "hw" ? pctKleur(value, [70, 40]) : pctKleur(value, [80, 60]);
  const tekst = soort === "cijfer" ? `${label} ${value.toFixed(1)}` : `${label} ${value}%`;
  return <Badge text={tekst} {...kleur} />;
}

export default function DocentStatistieken() {
  const { t, tel, isRTL, label } = useT();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Stats>("/api/docent/statistieken");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Empty text={t("st_geen")} />;

  const tot = data.totalen;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.statGrid}>
        {[
          { label: t("c_klassen"), value: tot.klassen },
          { label: t("c_leerlingen"), value: tot.leerlingen },
          { label: t("c_vakken"), value: tot.vakken },
        ].map((s) => (
          <View key={s.label} style={styles.statBox}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      <SectionTitle>{t("st_per_klas")}</SectionTitle>
      {data.perKlas.length === 0 ? (
        <Empty text={t("st_geen_klassen")} />
      ) : (
        data.perKlas.map((k) => (
          <Card key={k.id}>
            <Text style={[styles.naam, { textAlign: textStart(isRTL) }]}>{k.naam}</Text>
            <Muted>{tel("c_n_leerlingen", k.leerlingenCount)}</Muted>
            <View style={[styles.badgeRow, { flexDirection: row(isRTL) }]}>
              <StatBadge label={t("c_aanwezig")} value={k.aanwezigheid} soort="pct" />
              <StatBadge label={t("st_gem")} value={k.avgCijfer} soort="cijfer" />
              <StatBadge label={t("c_huiswerk")} value={k.hwPercent} soort="hw" />
            </View>
          </Card>
        ))
      )}

      <SectionTitle>{t("st_per_vak")}</SectionTitle>
      {data.perVak.length === 0 ? (
        <Empty text={t("st_geen_vakken")} />
      ) : (
        data.perVak.map((v) => (
          <Card key={v.id}>
            <View style={[styles.row, { flexDirection: row(isRTL) }]}>
              <Text style={[styles.naam, { textAlign: textStart(isRTL) }]}>{v.naam}</Text>
              <Badge text={label("categorie", v.categorie)} />
            </View>
            <View style={[styles.badgeRow, { flexDirection: row(isRTL) }]}>
              <StatBadge label={t("st_gem")} value={v.avgCijfer} soort="cijfer" />
              <StatBadge label={t("c_huiswerk")} value={v.hwPercent} soort="hw" />
            </View>
          </Card>
        ))
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
    width: "31%" as unknown as number,
    marginBottom: 12,
    alignItems: "center",
  },
  statValue: { fontSize: 24, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  naam: { fontSize: 15, fontWeight: "600", color: colors.text },
  row: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  badgeRow: { flexWrap: "wrap", gap: 6, marginTop: 8 },
});

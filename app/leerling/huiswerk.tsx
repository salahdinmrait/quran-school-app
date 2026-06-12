import { useState } from "react";
import { View, Text, StyleSheet, Linking, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFetch } from "../../lib/useFetch";
import { getApiUrl, getAuthToken } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty } from "../../components/ui";
import { colors } from "../../lib/theme";
import { fmtDatum, fmtDatumTijd, isVerlopen } from "../../lib/format";

interface Huiswerk {
  id: string;
  titel: string;
  beschrijving: string | null;
  deadline: string | null;
  vak: { naam: string; categorie: string };
  bijlageNaam: string | null;
  hasBijlage: boolean;
  ingeLeverd: boolean;
  inlevering?: {
    inhoud: string;
    createdAt: string;
    opmerking: string | null;
    opmerkingOp: string | null;
  };
}

interface KlasRanking {
  klasId: string;
  klasNaam: string;
  top3: { positie: number; leerling: { id: string; name: string }; percentage: number }[];
  totaalHw: number;
  eigenPositie: number | null;
  eigenPercentage: number;
  aantalLeerlingen?: number;
}

const MEDAILLES = ["🥇", "🥈", "🥉"];

export default function LeerlingHuiswerk() {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Huiswerk[]>("/api/leerling/huiswerk");
  const rk = useFetch<KlasRanking[]>("/api/leerling/ranking");
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const rankings = (rk.data ?? []).filter((r) => r.totaalHw > 0);

  const open = (data ?? []).filter((h) => !h.ingeLeverd);
  const klaar = (data ?? []).filter((h) => h.ingeLeverd);

  function openBijlage(hw: Huiswerk) {
    const token = getAuthToken();
    Linking.openURL(`${getApiUrl()}/api/bijlage/${hw.id}?token=${encodeURIComponent(token ?? "")}`);
  }

  function renderItem(hw: Huiswerk) {
    const expanded = openId === hw.id;
    const verlopen = !hw.ingeLeverd && isVerlopen(hw.deadline);
    return (
      <Card key={hw.id} onPress={() => setOpenId(expanded ? null : hw.id)}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{hw.titel}</Text>
            <Muted>
              {hw.vak.naam} · deadline {fmtDatum(hw.deadline)}
            </Muted>
          </View>
          {hw.ingeLeverd ? (
            <Badge text="Afgerond ✓" />
          ) : verlopen ? (
            <Badge text="Verlopen" bg={colors.dangerLight} fg={colors.danger} />
          ) : (
            <Badge text="Open" bg={colors.warningLight} fg={colors.warning} />
          )}
        </View>

        {expanded && (
          <View style={styles.detail}>
            {hw.beschrijving ? <Text style={styles.beschrijving}>{hw.beschrijving}</Text> : null}

            {hw.hasBijlage && (
              <Pressable style={styles.bijlageRow} onPress={() => openBijlage(hw)}>
                <Ionicons name="attach" size={18} color={colors.info} />
                <Text style={styles.bijlageText}>{hw.bijlageNaam ?? "Bijlage openen"}</Text>
              </Pressable>
            )}

            {hw.inlevering && (
              <View style={styles.inleveringBox}>
                <Muted>Afgevinkt door docent op {fmtDatumTijd(hw.inlevering.createdAt)}</Muted>
                {hw.inlevering.opmerking ? (
                  <View style={styles.opmerkingBox}>
                    <Text style={styles.opmerkingLabel}>Opmerking van docent:</Text>
                    <Text style={styles.opmerkingText}>{hw.inlevering.opmerking}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {!hw.ingeLeverd && (
              <Muted style={{ marginTop: 8 }}>
                De docent vinkt dit huiswerk af zodra het in de les is gecontroleerd.
              </Muted>
            )}
          </View>
        )}
      </Card>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {rankings.map((r) => (
        <View key={r.klasId} style={styles.rankCard}>
          <Text style={styles.rankTitle}>🏆 Klassement {r.klasNaam}</Text>
          {r.top3.map((item) => (
            <View key={item.leerling.id} style={styles.rankRow}>
              <Text style={styles.rankMedal}>{MEDAILLES[item.positie - 1]}</Text>
              <Text style={styles.rankNaam}>{item.leerling.name}</Text>
              <Text style={styles.rankPct}>{item.percentage}%</Text>
            </View>
          ))}
          {r.eigenPositie !== null && (
            <Text style={styles.eigenPositie}>
              Jouw positie: #{r.eigenPositie} · {r.eigenPercentage}% ingeleverd
            </Text>
          )}
        </View>
      ))}

      {(data ?? []).length === 0 ? (
        <Empty text="Nog geen huiswerk." />
      ) : (
        <>
          {open.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Open ({open.length})</Text>
              {open.map(renderItem)}
            </>
          )}
          {klaar.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Afgerond ({klaar.length})</Text>
              {klaar.map(renderItem)}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 8,
  },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  beschrijving: { fontSize: 14, color: colors.text, marginBottom: 8 },
  bijlageRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  bijlageText: { color: colors.info, fontSize: 14, textDecorationLine: "underline" },
  inleveringBox: { marginTop: 6 },
  opmerkingBox: {
    backgroundColor: colors.infoLight,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  opmerkingLabel: { fontSize: 12, fontWeight: "600", color: colors.info, marginBottom: 2 },
  opmerkingText: { fontSize: 14, color: colors.text },
  rankCard: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  rankTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 8 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  rankMedal: { fontSize: 18, width: 28, textAlign: "center" },
  rankNaam: { flex: 1, fontSize: 14, fontWeight: "500", color: colors.text },
  rankPct: { fontSize: 14, fontWeight: "700", color: colors.primaryDark },
  eigenPositie: { marginTop: 8, fontSize: 13, color: colors.textMuted, fontWeight: "600" },
});

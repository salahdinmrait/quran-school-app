import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Muted, Empty } from "../../components/ui";
import { colors, STATUS_LABELS, STATUS_COLORS } from "../../lib/theme";
import { fmtDatumKort } from "../../lib/format";

const STATUSES = ["AANWEZIG", "TE_LAAT", "GEOORLOOFD", "AFWEZIG"] as const;

interface Les {
  id: string;
  datum: string;
  begintijd: string;
  eindtijd: string;
  lokaal: string | null;
  klas: {
    id: string;
    naam: string;
    leerlingen: { leerling: { id: string; name: string } }[];
  };
}

interface AanwezigheidRecord {
  id: string;
  status: string;
  leerling: { id: string; name: string };
}

export default function DocentAbsentie() {
  const ls = useFetch<Les[]>("/api/docent/lessen");
  const [lesId, setLesId] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, string>>({});
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectLes = useCallback(async (les: Les) => {
    setLesId(les.id);
    setLoadingRecords(true);
    setError(null);
    try {
      const data = await api<AanwezigheidRecord[]>(`/api/docent/absentie?lesId=${les.id}`);
      const map: Record<string, string> = {};
      for (const r of data) map[r.leerling.id] = r.status;
      setRecords(map);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kon absentie niet laden");
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  async function setStatus(leerlingId: string, status: string) {
    if (!lesId) return;
    const prev = records[leerlingId];
    setRecords((r) => ({ ...r, [leerlingId]: status }));
    try {
      await api("/api/docent/absentie", {
        method: "POST",
        body: JSON.stringify({ lesId, leerlingId, status }),
      });
    } catch (e) {
      setRecords((r) => ({ ...r, [leerlingId]: prev }));
      setError(e instanceof ApiError ? e.message : "Opslaan mislukt");
    }
  }

  if (ls.loading) return <Loading />;
  if (ls.error) return <ErrorView message={ls.error} onRetry={ls.reload} />;

  const lessen = ls.data ?? [];
  const les = lessen.find((l) => l.id === lesId) ?? null;

  if (!les) {
    return (
      <Screen refreshing={ls.refreshing} onRefresh={ls.refresh}>
        <Text style={styles.sectionLabel}>Kies een les</Text>
        {lessen.length === 0 ? (
          <Empty text="Geen lessen gevonden." />
        ) : (
          lessen.map((l) => (
            <Card key={l.id} onPress={() => selectLes(l)}>
              <Text style={styles.title}>{l.klas.naam}</Text>
              <Muted>
                {fmtDatumKort(l.datum)} · {l.begintijd}–{l.eindtijd}
                {l.lokaal ? ` · ${l.lokaal}` : ""}
              </Muted>
            </Card>
          ))
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <Card onPress={() => setLesId(null)}>
        <Text style={styles.title}>{les.klas.naam}</Text>
        <Muted>
          {fmtDatumKort(les.datum)} · {les.begintijd}–{les.eindtijd} · tik om andere les te kiezen
        </Muted>
      </Card>

      {error && <Text style={styles.error}>{error}</Text>}
      {loadingRecords ? (
        <Loading />
      ) : (
        les.klas.leerlingen.map(({ leerling }) => {
          const current = records[leerling.id];
          return (
            <Card key={leerling.id}>
              <Text style={styles.leerlingNaam}>{leerling.name}</Text>
              <View style={styles.statusRow}>
                {STATUSES.map((s) => {
                  const active = current === s;
                  const c = STATUS_COLORS[s];
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setStatus(leerling.id, s)}
                      style={[
                        styles.statusChip,
                        active && { backgroundColor: c.bg, borderColor: c.fg },
                      ]}
                    >
                      <Text style={[styles.statusText, active && { color: c.fg, fontWeight: "700" }]}>
                        {STATUS_LABELS[s]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  leerlingNaam: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 8 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.card,
  },
  statusText: { fontSize: 12, color: colors.textMuted },
  error: { color: colors.danger, marginBottom: 8 },
});

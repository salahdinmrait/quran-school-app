import { Text, StyleSheet, View } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button } from "../../components/ui";
import { bevestig } from "../../lib/confirm";
import { colors, ROLE_LABELS } from "../../lib/theme";
import { fmtDatum } from "../../lib/format";
import { useState } from "react";

interface ArchiefData {
  gebruikers: { id: string; name: string; email: string; role: string; verwijderdOp: string }[];
  klassen: { id: string; naam: string; verwijderdOp: string }[];
  vakken: { id: string; naam: string; categorie: string; verwijderdOp: string }[];
}

// Archief van verwijderde personen/klassen/vakken. Alleen ADMIN.
// Items kunnen hier alleen nog definitief verwijderd worden (geen terugzetten).
export default function AdminArchief() {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<ArchiefData>("/api/admin/archief");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const gebruikers = data?.gebruikers ?? [];
  const klassen = data?.klassen ?? [];
  const vakken = data?.vakken ?? [];
  const leeg = gebruikers.length === 0 && klassen.length === 0 && vakken.length === 0;

  function definitief(type: "gebruiker" | "klas" | "vak", id: string, naam: string) {
    bevestig(
      "Definitief verwijderen",
      `"${naam}" en alle bijbehorende gegevens definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`,
      async () => {
        setBusyId(id);
        setActionError(null);
        try {
          await api("/api/admin/archief", {
            method: "DELETE",
            body: JSON.stringify({ type, id }),
          });
          await reload();
        } catch (e) {
          setActionError(e instanceof ApiError ? e.message : "Verwijderen mislukt");
        } finally {
          setBusyId(null);
        }
      },
      "Definitief verwijderen"
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Muted style={{ marginBottom: 12 }}>
        Verwijderde items belanden hier. Definitief verwijderen wist ook alle bijbehorende gegevens en kan niet ongedaan worden gemaakt.
      </Muted>
      {actionError && <Text style={styles.error}>{actionError}</Text>}

      {leeg && <Empty icon="archive-outline" text="Het archief is leeg." />}

      {gebruikers.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Personen ({gebruikers.length})</Text>
          {gebruikers.map((g) => (
            <Card key={g.id}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{g.name}</Text>
                  <Muted>{g.email} · gearchiveerd {fmtDatum(g.verwijderdOp)}</Muted>
                </View>
                <Badge text={ROLE_LABELS[g.role] ?? g.role} />
              </View>
              <View style={styles.btnRow}>
                <Button
                  small
                  title="Definitief verwijderen"
                  variant="danger"
                  loading={busyId === g.id}
                  onPress={() => definitief("gebruiker", g.id, g.name)}
                />
              </View>
            </Card>
          ))}
        </>
      )}

      {klassen.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Klassen ({klassen.length})</Text>
          {klassen.map((k) => (
            <Card key={k.id}>
              <Text style={styles.title}>{k.naam}</Text>
              <Muted>gearchiveerd {fmtDatum(k.verwijderdOp)}</Muted>
              <View style={styles.btnRow}>
                <Button
                  small
                  title="Definitief verwijderen"
                  variant="danger"
                  loading={busyId === k.id}
                  onPress={() => definitief("klas", k.id, k.naam)}
                />
              </View>
            </Card>
          ))}
        </>
      )}

      {vakken.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Vakken ({vakken.length})</Text>
          {vakken.map((v) => (
            <Card key={v.id}>
              <Text style={styles.title}>{v.naam}</Text>
              <Muted>gearchiveerd {fmtDatum(v.verwijderdOp)}</Muted>
              <View style={styles.btnRow}>
                <Button
                  small
                  title="Definitief verwijderen"
                  variant="danger"
                  loading={busyId === v.id}
                  onPress={() => definitief("vak", v.id, v.naam)}
                />
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
  btnRow: { flexDirection: "row", marginTop: 8 },
  error: { color: colors.danger, marginBottom: 8 },
});

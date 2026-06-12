import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Muted, Empty, Button, Input, ChipSelect } from "../../components/ui";
import { colors } from "../../lib/theme";
import { fmtDatumKort } from "../../lib/format";
import type { DocentKlas } from "./klassen";

interface Les {
  id: string;
  datum: string;
  begintijd: string;
  eindtijd: string;
  lokaal: string | null;
  klas: { id: string; naam: string };
  vak: { id: string; naam: string } | null;
}

export default function DocentRooster() {
  const ls = useFetch<Les[]>("/api/docent/lessen");
  const kl = useFetch<DocentKlas[]>("/api/docent/klassen");

  const [showForm, setShowForm] = useState(false);
  const [klasId, setKlasId] = useState<string | null>(null);
  const [vakId, setVakId] = useState<string | null>(null);
  const [datum, setDatum] = useState("");
  const [begintijd, setBegintijd] = useState("");
  const [eindtijd, setEindtijd] = useState("");
  const [lokaal, setLokaal] = useState("");
  const [herhalenTot, setHerhalenTot] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (ls.loading || kl.loading) return <Loading />;
  if (ls.error) return <ErrorView message={ls.error} onRetry={ls.reload} />;

  const lessen = ls.data ?? [];
  const klassen = kl.data ?? [];
  const klas = klassen.find((k) => k.id === klasId) ?? null;

  async function handleSubmit() {
    if (!klasId || !datum || !begintijd || !eindtijd) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/lessen", {
        method: "POST",
        body: JSON.stringify({
          klasId,
          vakId: vakId || null,
          datum,
          begintijd,
          eindtijd,
          lokaal: lokaal || null,
          ...(herhalenTot ? { herhalen: { totDatum: herhalenTot } } : {}),
        }),
      });
      setShowForm(false);
      setDatum("");
      setBegintijd("");
      setEindtijd("");
      setLokaal("");
      setHerhalenTot("");
      await ls.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kon les niet aanmaken");
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteLes(l: Les) {
    Alert.alert("Les verwijderen", `${l.klas.naam} op ${fmtDatumKort(l.datum)} verwijderen?`, [
      { text: "Annuleren", style: "cancel" },
      {
        text: "Verwijderen",
        style: "destructive",
        onPress: async () => {
          setDeleteError(null);
          try {
            await api(`/api/lessen/${l.id}`, { method: "DELETE" });
            await ls.reload();
          } catch (e) {
            setDeleteError(e instanceof ApiError ? e.message : "Verwijderen mislukt");
          }
        },
      },
    ]);
  }

  return (
    <Screen refreshing={ls.refreshing} onRefresh={ls.refresh}>
      <Button
        title={showForm ? "Formulier sluiten" : "+ Les inplannen"}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm(!showForm)}
      />

      {showForm && (
        <Card>
          <ChipSelect
            label="Klas *"
            options={klassen.map((k) => ({ value: k.id, label: k.naam }))}
            value={klasId}
            onChange={(v) => {
              setKlasId(v);
              setVakId(null);
            }}
          />
          {klas && klas.vakken.length > 0 && (
            <ChipSelect
              label="Vak (optioneel)"
              options={[{ value: "", label: "Geen" }, ...klas.vakken.map((v) => ({ value: v.id, label: v.naam }))]}
              value={vakId ?? ""}
              onChange={(v) => setVakId(v || null)}
            />
          )}
          <Input label="Datum (JJJJ-MM-DD) *" value={datum} onChangeText={setDatum} placeholder="2026-06-15" autoCapitalize="none" />
          <Input label="Begintijd *" value={begintijd} onChangeText={setBegintijd} placeholder="10:00" autoCapitalize="none" />
          <Input label="Eindtijd *" value={eindtijd} onChangeText={setEindtijd} placeholder="12:00" autoCapitalize="none" />
          <Input label="Lokaal" value={lokaal} onChangeText={setLokaal} placeholder="Lokaal 2" />
          <Input
            label="Wekelijks herhalen tot (JJJJ-MM-DD, optioneel)"
            value={herhalenTot}
            onChangeText={setHerhalenTot}
            placeholder="2026-12-20"
            autoCapitalize="none"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button
            title={herhalenTot ? "Herhalende lessen aanmaken" : "Les aanmaken"}
            onPress={handleSubmit}
            loading={saving}
            disabled={!klasId || !datum || !begintijd || !eindtijd}
          />
        </Card>
      )}

      {deleteError && <Text style={styles.error}>{deleteError}</Text>}
      {lessen.length === 0 ? (
        <Empty text="Geen lessen ingepland." />
      ) : (
        lessen.map((l) => (
          <Card key={l.id}>
            <View style={styles.lesRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  {l.klas.naam}
                  {l.vak ? ` · ${l.vak.naam}` : ""}
                </Text>
                <Muted>
                  {fmtDatumKort(l.datum)} · {l.begintijd}–{l.eindtijd}
                  {l.lokaal ? ` · ${l.lokaal}` : ""}
                </Muted>
              </View>
              <Button small title="Verwijderen" variant="ghost" onPress={() => confirmDeleteLes(l)} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  lesRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  error: { color: colors.danger, marginBottom: 8 },
});

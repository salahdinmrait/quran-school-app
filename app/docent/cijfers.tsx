import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect } from "../../components/ui";
import { colors } from "../../lib/theme";
import { fmtDatum } from "../../lib/format";
import type { DocentKlas } from "./klassen";

interface Cijfer {
  id: string;
  waarde: number;
  omschrijving: string | null;
  datum: string;
  leerling: { id: string; name: string };
  vak: { id: string; naam: string };
}

export default function DocentCijfers() {
  const cf = useFetch<Cijfer[]>("/api/docent/cijfers");
  const kl = useFetch<DocentKlas[]>("/api/docent/klassen");

  const [showForm, setShowForm] = useState(false);
  const [klasId, setKlasId] = useState<string | null>(null);
  const [leerlingId, setLeerlingId] = useState<string | null>(null);
  const [vakId, setVakId] = useState<string | null>(null);
  const [waarde, setWaarde] = useState("");
  const [omschrijving, setOmschrijving] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cf.loading || kl.loading) return <Loading />;
  if (cf.error) return <ErrorView message={cf.error} onRetry={cf.reload} />;

  const cijfers = cf.data ?? [];
  const klassen = kl.data ?? [];
  const klas = klassen.find((k) => k.id === klasId) ?? null;

  async function handleSubmit() {
    if (!leerlingId || !vakId || !waarde) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/docent/cijfers", {
        method: "POST",
        body: JSON.stringify({ leerlingId, vakId, waarde, omschrijving: omschrijving || null }),
      });
      setWaarde("");
      setOmschrijving("");
      setShowForm(false);
      await cf.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kon cijfer niet opslaan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen refreshing={cf.refreshing} onRefresh={cf.refresh}>
      <Button
        title={showForm ? "Formulier sluiten" : "+ Cijfer invoeren"}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm(!showForm)}
      />

      {showForm && (
        <Card>
          <ChipSelect
            label="Klas"
            options={klassen.map((k) => ({ value: k.id, label: k.naam }))}
            value={klasId}
            onChange={(v) => {
              setKlasId(v);
              setLeerlingId(null);
              setVakId(null);
            }}
          />
          {klas && (
            <>
              <ChipSelect
                label="Leerling"
                options={klas.leerlingen.map((l) => ({ value: l.id, label: l.name }))}
                value={leerlingId}
                onChange={setLeerlingId}
              />
              <ChipSelect
                label="Vak"
                options={klas.vakken.map((v) => ({ value: v.id, label: v.naam }))}
                value={vakId}
                onChange={setVakId}
              />
            </>
          )}
          <Input label="Cijfer (1–10)" value={waarde} onChangeText={setWaarde} keyboardType="numeric" placeholder="7.5" />
          <Input label="Omschrijving" value={omschrijving} onChangeText={setOmschrijving} placeholder="bijv. Tajweed-toets" />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button
            title="Opslaan"
            onPress={handleSubmit}
            loading={saving}
            disabled={!leerlingId || !vakId || !waarde}
          />
        </Card>
      )}

      {cijfers.length === 0 ? (
        <Empty text="Nog geen cijfers ingevoerd." />
      ) : (
        cijfers.map((c) => (
          <Card key={c.id}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{c.leerling.name}</Text>
                <Muted>
                  {c.vak.naam} · {fmtDatum(c.datum)}
                  {c.omschrijving ? ` · ${c.omschrijving}` : ""}
                </Muted>
              </View>
              <Badge
                text={c.waarde.toFixed(1)}
                bg={c.waarde >= 5.5 ? colors.successLight : colors.dangerLight}
                fg={c.waarde >= 5.5 ? colors.primaryDark : colors.danger}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  error: { color: colors.danger, marginBottom: 8 },
});

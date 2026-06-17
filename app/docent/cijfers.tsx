import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect } from "../../components/ui";
import { LinkText } from "../../components/LinkText";
import { pickBijlage, openAttachment, GekozenBijlage } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
import { fmtDatum } from "../../lib/format";
import type { DocentKlas } from "./klassen";

interface Cijfer {
  id: string;
  waarde: number;
  omschrijving: string | null;
  opmerking: string | null;
  hasBijlage: boolean;
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
  const [opmerking, setOpmerking] = useState("");
  const [bijlage, setBijlage] = useState<GekozenBijlage | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cf.loading || kl.loading) return <Loading />;
  if (cf.error) return <ErrorView message={cf.error} onRetry={cf.reload} />;

  const cijfers = cf.data ?? [];
  const klassen = kl.data ?? [];
  const klas = klassen.find((k) => k.id === klasId) ?? null;

  async function kies() {
    setError(null);
    const { bijlage: b, error: e } = await pickBijlage();
    if (e) setError(e);
    else if (b) setBijlage(b);
  }

  function confirmDelete(c: Cijfer) {
    Alert.alert("Cijfer verwijderen", `Cijfer ${c.waarde.toFixed(1)} van ${c.leerling.name} verwijderen?`, [
      { text: "Annuleren", style: "cancel" },
      {
        text: "Verwijderen",
        style: "destructive",
        onPress: async () => {
          setError(null);
          try {
            await api(`/api/docent/cijfers/${c.id}`, { method: "DELETE" });
            await cf.reload();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : "Verwijderen mislukt");
          }
        },
      },
    ]);
  }

  async function handleSubmit() {
    if (!leerlingId || !vakId || !waarde) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/docent/cijfers", {
        method: "POST",
        body: JSON.stringify({
          leerlingId, vakId, waarde,
          omschrijving: omschrijving || null,
          opmerking: opmerking || null,
          ...(bijlage ? { bijlageNaam: bijlage.naam, bijlageData: bijlage.data, bijlageType: bijlage.type } : {}),
        }),
      });
      setWaarde(""); setOmschrijving(""); setOpmerking(""); setBijlage(null);
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
            onChange={(v) => { setKlasId(v); setLeerlingId(null); setVakId(null); }}
          />
          {klas && (
            <>
              <ChipSelect label="Leerling" options={klas.leerlingen.map((l) => ({ value: l.id, label: l.name }))} value={leerlingId} onChange={setLeerlingId} />
              <ChipSelect label="Vak" options={klas.vakken.map((v) => ({ value: v.id, label: v.naam }))} value={vakId} onChange={setVakId} />
            </>
          )}
          <Input label="Cijfer (1–10)" value={waarde} onChangeText={setWaarde} keyboardType="numeric" placeholder="7.5" />
          <Input label="Omschrijving" value={omschrijving} onChangeText={setOmschrijving} placeholder="bijv. Tajweed-toets" />
          <Input label="Opmerking (optioneel)" value={opmerking} onChangeText={setOpmerking} multiline placeholder="Feedback voor leerling en ouder" />
          <View style={styles.bijlageRow}>
            {bijlage ? (
              <>
                <Text style={styles.bijlageNaam} numberOfLines={1}>📎 {bijlage.naam}</Text>
                <Button small title="Verwijderen" variant="ghost" onPress={() => setBijlage(null)} />
              </>
            ) : (
              <Button small title="Bestand bijvoegen (bv. de toets)" variant="secondary" onPress={kies} />
            )}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Opslaan" onPress={handleSubmit} loading={saving} disabled={!leerlingId || !vakId || !waarde} />
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
                {c.opmerking ? <LinkText style={styles.opmerking}>{c.opmerking}</LinkText> : null}
                {c.hasBijlage ? (
                  <Text style={styles.bijlage} onPress={() => openAttachment("cijfer", c.id)}>📎 Bijlage</Text>
                ) : null}
              </View>
              <Badge
                text={c.waarde.toFixed(1)}
                bg={c.waarde >= 5.5 ? colors.successLight : colors.dangerLight}
                fg={c.waarde >= 5.5 ? colors.primaryDark : colors.danger}
              />
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Button small title="Verwijderen" variant="ghost" onPress={() => confirmDelete(c)} />
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
  opmerking: { fontSize: 13, color: colors.info, marginTop: 4 },
  bijlage: { fontSize: 13, color: colors.info, textDecorationLine: "underline", marginTop: 4 },
  bijlageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
  error: { color: colors.danger, marginBottom: 8 },
});

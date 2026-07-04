import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { bevestig } from "../../lib/confirm";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Loading, ErrorView, Card, Muted, Button, Input, ChipSelect } from "../../components/ui";
import { Agenda, AgendaEvent } from "../../components/Agenda";
import { DateField, TimeField } from "../../components/DateField";
import { LinkText } from "../../components/LinkText";
import { pickBijlage, openAttachment, GekozenBijlage } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
import { fmtDatumKort } from "../../lib/format";
import type { DocentKlas } from "./klassen";

interface Les {
  id: string;
  datum: string;
  begintijd: string;
  eindtijd: string;
  lokaal: string | null;
  beschrijving: string | null;
  hasBijlage: boolean;
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
  const [beschrijving, setBeschrijving] = useState("");
  const [herhalenTot, setHerhalenTot] = useState("");
  const [bijlage, setBijlage] = useState<GekozenBijlage | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ls.loading || kl.loading) return <Loading />;
  if (ls.error) return <ErrorView message={ls.error} onRetry={ls.reload} />;

  const lessen = ls.data ?? [];
  const klassen = kl.data ?? [];
  const klas = klassen.find((k) => k.id === klasId) ?? null;

  async function kies() {
    setError(null);
    const { bijlage: b, error: e } = await pickBijlage();
    if (e) setError(e);
    else if (b) setBijlage(b);
  }

  async function handleSubmit() {
    if (!klasId || !datum || !begintijd || !eindtijd) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/lessen", {
        method: "POST",
        body: JSON.stringify({
          klasId, vakId: vakId || null, datum, begintijd, eindtijd,
          lokaal: lokaal || null,
          beschrijving: beschrijving || null,
          ...(bijlage ? { bijlageNaam: bijlage.naam, bijlageData: bijlage.data, bijlageType: bijlage.type } : {}),
          ...(herhalenTot ? { herhalen: { totDatum: herhalenTot } } : {}),
        }),
      });
      setShowForm(false);
      setDatum(""); setBegintijd(""); setEindtijd(""); setLokaal(""); setBeschrijving(""); setHerhalenTot(""); setBijlage(null);
      await ls.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kon les niet aanmaken");
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteLes(l: Les) {
    bevestig("Les verwijderen", `${l.klas.naam} op ${fmtDatumKort(l.datum)} verwijderen?`, async () => {
      try {
        await api(`/api/lessen/${l.id}`, { method: "DELETE" });
        await ls.reload();
      } catch { /* noop */ }
    });
  }

  const events: AgendaEvent[] = lessen.map((l) => ({
    id: l.id,
    datum: l.datum,
    begintijd: l.begintijd,
    eindtijd: l.eindtijd,
    titel: l.klas.naam + (l.vak ? ` · ${l.vak.naam}` : ""),
    subtitel: l.lokaal || undefined,
    onPress: () => confirmDeleteLes(l),
    extra: (
      <View>
        {l.beschrijving ? <LinkText style={styles.beschrijving}>{l.beschrijving}</LinkText> : null}
        {l.hasBijlage ? (
          <Text style={styles.bijlage} onPress={() => openAttachment("les", l.id)}>📎 Lesbijlage</Text>
        ) : null}
      </View>
    ),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Button
          title={showForm ? "Sluiten" : "+ Les inplannen"}
          variant={showForm ? "secondary" : "primary"}
          small
          onPress={() => setShowForm(!showForm)}
        />
        <Muted>Tik op een les om te verwijderen</Muted>
      </View>

      {showForm ? (
        <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Card>
            <ChipSelect
              label="Klas *"
              options={klassen.map((k) => ({ value: k.id, label: k.naam }))}
              value={klasId}
              onChange={(v) => { setKlasId(v); setVakId(null); }}
            />
            {klas && klas.vakken.length > 0 && (
              <ChipSelect
                label="Vak (optioneel)"
                options={[{ value: "", label: "Geen" }, ...klas.vakken.map((v) => ({ value: v.id, label: v.naam }))]}
                value={vakId ?? ""}
                onChange={(v) => setVakId(v || null)}
              />
            )}
            <DateField label="Datum *" value={datum} onChange={setDatum} />
            <TimeField label="Begintijd *" value={begintijd} onChange={setBegintijd} />
            <TimeField label="Eindtijd *" value={eindtijd} onChange={setEindtijd} />
            <Input label="Lokaal" value={lokaal} onChangeText={setLokaal} placeholder="Lokaal 2" />
            <Input label="Omschrijving / opmerking" value={beschrijving} onChangeText={setBeschrijving} multiline placeholder="bijv. Neem soera Al-Mulk door" />
            <View style={styles.bijlageRow}>
              {bijlage ? (
                <>
                  <Text style={styles.bijlageNaam} numberOfLines={1}>📎 {bijlage.naam}</Text>
                  <Button small title="Verwijderen" variant="ghost" onPress={() => setBijlage(null)} />
                </>
              ) : (
                <Button small title="Bestand bijvoegen (max 4 MB)" variant="secondary" onPress={kies} />
              )}
            </View>
            <DateField label="Wekelijks herhalen tot (optioneel)" value={herhalenTot} onChange={setHerhalenTot} minimumDate={datum ? new Date(datum) : undefined} />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button
              title={herhalenTot ? "Herhalende lessen aanmaken" : "Les aanmaken"}
              onPress={handleSubmit}
              loading={saving}
              disabled={!klasId || !datum || !begintijd || !eindtijd}
            />
          </Card>
        </ScrollView>
      ) : (
        <View style={styles.agendaWrap}>
          <Agenda events={events} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  formScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  agendaWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  beschrijving: { fontSize: 13, color: colors.text, marginTop: 6 },
  bijlage: { color: colors.info, fontSize: 13, textDecorationLine: "underline", marginTop: 6 },
  bijlageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
  error: { color: colors.danger, marginBottom: 8 },
});

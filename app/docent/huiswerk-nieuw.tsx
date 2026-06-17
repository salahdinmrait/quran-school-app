import { useState } from "react";
import { Text, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Button, Input, ChipSelect, CheckRow, Muted, Card } from "../../components/ui";
import { DateField } from "../../components/DateField";
import { pickBijlage, GekozenBijlage } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
import type { DocentKlas } from "./klassen";

interface Les {
  id: string;
  datum: string;
  begintijd: string;
  klas: { id: string; naam: string };
}

export default function DocentHuiswerkNieuw() {
  const router = useRouter();
  const kl = useFetch<DocentKlas[]>("/api/docent/klassen");
  const ls = useFetch<Les[]>("/api/docent/lessen");

  const [titel, setTitel] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [deadline, setDeadline] = useState("");
  const [klasId, setKlasId] = useState<string | null>(null);
  const [vakId, setVakId] = useState<string | null>(null);
  const [lesId, setLesId] = useState<string | null>(null);
  const [perLeerling, setPerLeerling] = useState(false);
  const [leerlingIds, setLeerlingIds] = useState<Set<string>>(new Set());
  const [bijlage, setBijlage] = useState<GekozenBijlage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (kl.loading || ls.loading) return <Loading />;
  if (kl.error) return <ErrorView message={kl.error} onRetry={kl.reload} />;

  const klassen = kl.data ?? [];
  const klas = klassen.find((k) => k.id === klasId) ?? null;
  const vakken = klas
    ? klas.vakken
    : Array.from(new Map(klassen.flatMap((k) => k.vakken).map((v) => [v.id, v])).values());
  const lessen = (ls.data ?? []).filter((l) => !klasId || l.klas.id === klasId).slice(0, 20);

  async function kies() {
    setError(null);
    const { bijlage: b, error: e } = await pickBijlage();
    if (e) setError(e);
    else if (b) setBijlage(b);
  }

  function toggleLeerling(id: string) {
    setLeerlingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!titel || !vakId) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/docent/huiswerk", {
        method: "POST",
        body: JSON.stringify({
          titel,
          beschrijving: beschrijving || null,
          deadline: deadline || null,
          vakId,
          lesId: lesId || null,
          ...(perLeerling && leerlingIds.size > 0 ? { leerlingIds: Array.from(leerlingIds) } : {}),
          ...(bijlage ? { bijlageNaam: bijlage.naam, bijlageData: bijlage.data, bijlageType: bijlage.type } : {}),
        }),
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kon huiswerk niet aanmaken");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      {klassen.length === 0 && (
        <Card style={{ borderColor: colors.warning, backgroundColor: colors.warningLight }}>
          <Text style={{ color: colors.warning }}>
            Je bent nog niet aan een klas gekoppeld — vraag de beheerder om je toe te voegen.
          </Text>
        </Card>
      )}

      <Input label="Titel *" value={titel} onChangeText={setTitel} placeholder="bijv. Surah Al-Fatiha herhalen" />
      <Input label="Beschrijving" value={beschrijving} onChangeText={setBeschrijving} multiline placeholder="Uitleg voor de leerlingen (links zijn klikbaar)..." />
      <DateField label="Deadline" value={deadline} onChange={setDeadline} placeholder="Kies een deadline" />

      {klassen.length > 0 && (
        <ChipSelect
          label="Klas"
          options={klassen.map((k) => ({ value: k.id, label: k.naam }))}
          value={klasId}
          onChange={(v) => { setKlasId(v); setVakId(null); setLesId(null); setPerLeerling(false); setLeerlingIds(new Set()); }}
        />
      )}

      <ChipSelect label="Vak *" options={vakken.map((v) => ({ value: v.id, label: v.naam }))} value={vakId} onChange={setVakId} />

      {lessen.length > 0 && (
        <ChipSelect
          label="Koppel aan les (optioneel)"
          options={[{ value: "", label: "Geen" }, ...lessen.map((l) => ({ value: l.id, label: `${l.klas.naam} ${l.datum.slice(0, 10)}` }))]}
          value={lesId ?? ""}
          onChange={(v) => setLesId(v || null)}
        />
      )}

      {/* Per leerling i.p.v. hele klas */}
      {klas && klas.leerlingen.length > 0 && (
        <View style={styles.box}>
          <CheckRow
            label="Alleen voor specifieke leerlingen"
            sublabel="Standaard: voor iedereen met dit vak"
            checked={perLeerling}
            onToggle={() => { setPerLeerling(!perLeerling); setLeerlingIds(new Set()); }}
          />
          {perLeerling && klas.leerlingen.map((l) => (
            <CheckRow key={l.id} label={l.name} checked={leerlingIds.has(l.id)} onToggle={() => toggleLeerling(l.id)} />
          ))}
        </View>
      )}

      <View style={styles.bijlageBox}>
        <Text style={styles.bijlageLabel}>Bijlage (foto, pdf, audio — max 4 MB)</Text>
        {bijlage ? (
          <View style={styles.bijlageRow}>
            <Text style={styles.bijlageNaam} numberOfLines={1}>📎 {bijlage.naam}</Text>
            <Button small title="Verwijderen" variant="ghost" onPress={() => setBijlage(null)} />
          </View>
        ) : (
          <Button small title="Bestand kiezen" variant="secondary" onPress={kies} />
        )}
        <Muted style={{ marginTop: 4 }}>Grote video&apos;s (tot 500 MB) upload je via de website.</Muted>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        title="Huiswerk aanmaken"
        onPress={handleSubmit}
        loading={saving}
        disabled={!titel || !vakId || (perLeerling && leerlingIds.size === 0)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { marginBottom: 12 },
  bijlageBox: { marginBottom: 12 },
  bijlageLabel: { fontSize: 13, fontWeight: "500", color: colors.textMuted, marginBottom: 6 },
  bijlageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
  error: { color: colors.danger, marginBottom: 8 },
});

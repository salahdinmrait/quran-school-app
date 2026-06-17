import { useState } from "react";
import { View, Text, StyleSheet, Alert, Linking } from "react-native";
import { useFetch } from "../lib/useFetch";
import { api, ApiError } from "../lib/api";
import { Screen, Loading, ErrorView, Card, Muted, Empty, Button, Input, ChipSelect } from "./ui";
import { LinkText } from "./LinkText";
import { pickBijlage, openAttachment, GekozenBijlage } from "../lib/bijlage";
import { colors } from "../lib/theme";
import { fmtDatum } from "../lib/format";

interface Materiaal {
  id: string;
  titel: string;
  beschrijving: string | null;
  linkUrl: string | null;
  bijlageNaam: string | null;
  hasBijlage: boolean;
  docent: { id: string; name: string };
  klas: { id: string; naam: string } | null;
  vak: { id: string; naam: string } | null;
  createdAt: string;
}

interface DocentKlas {
  id: string;
  naam: string;
  vakken: { id: string; naam: string }[];
}

export function StudieMateriaalView({ canManage }: { canManage: boolean }) {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Materiaal[]>("/api/studiemateriaal");
  const kl = useFetch<DocentKlas[]>(canManage ? "/api/docent/klassen" : null);

  const [showForm, setShowForm] = useState(false);
  const [titel, setTitel] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [klasId, setKlasId] = useState<string | null>(null);
  const [vakId, setVakId] = useState<string | null>(null);
  const [bijlage, setBijlage] = useState<GekozenBijlage | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const materialen = data ?? [];
  const klassen = kl.data ?? [];
  const klas = klassen.find((k) => k.id === klasId) ?? null;

  async function kies() {
    setFormError(null);
    const { bijlage: b, error: e } = await pickBijlage();
    if (e) setFormError(e);
    else if (b) setBijlage(b);
  }

  async function handleCreate() {
    if (!titel) return;
    setSaving(true);
    setFormError(null);
    try {
      await api("/api/studiemateriaal", {
        method: "POST",
        body: JSON.stringify({
          titel,
          beschrijving: beschrijving || null,
          linkUrl: linkUrl || null,
          klasId: klasId || null,
          vakId: vakId || null,
          ...(bijlage ? { bijlageNaam: bijlage.naam, bijlageData: bijlage.data, bijlageType: bijlage.type } : {}),
        }),
      });
      setTitel(""); setBeschrijving(""); setLinkUrl(""); setKlasId(null); setVakId(null); setBijlage(null);
      setShowForm(false);
      await reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(m: Materiaal) {
    Alert.alert("Verwijderen", `"${m.titel}" verwijderen?`, [
      { text: "Annuleren", style: "cancel" },
      {
        text: "Verwijderen",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/studiemateriaal?id=${m.id}`, { method: "DELETE" });
            await reload();
          } catch { /* noop */ }
        },
      },
    ]);
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {canManage && (
        <Button
          title={showForm ? "Formulier sluiten" : "+ Nieuw studiemateriaal"}
          variant={showForm ? "secondary" : "primary"}
          onPress={() => setShowForm(!showForm)}
        />
      )}

      {canManage && showForm && (
        <Card>
          <Input label="Titel *" value={titel} onChangeText={setTitel} placeholder="bijv. Tajweed-regels hoofdstuk 3" />
          <Input label="Beschrijving" value={beschrijving} onChangeText={setBeschrijving} multiline />
          <Input label="Link (optioneel)" value={linkUrl} onChangeText={setLinkUrl} placeholder="https://..." autoCapitalize="none" />
          {klassen.length > 0 && (
            <ChipSelect
              label="Klas (optioneel)"
              options={[{ value: "", label: "Alle" }, ...klassen.map((k) => ({ value: k.id, label: k.naam }))]}
              value={klasId ?? ""}
              onChange={(v) => { setKlasId(v || null); setVakId(null); }}
            />
          )}
          {klas && klas.vakken.length > 0 && (
            <ChipSelect
              label="Vak (optioneel)"
              options={[{ value: "", label: "Alle" }, ...klas.vakken.map((v) => ({ value: v.id, label: v.naam }))]}
              value={vakId ?? ""}
              onChange={(v) => setVakId(v || null)}
            />
          )}
          <View style={styles.bijlageRow}>
            {bijlage ? (
              <>
                <Text style={styles.bijlageNaam} numberOfLines={1}>📎 {bijlage.naam}</Text>
                <Button small title="Verwijderen" variant="ghost" onPress={() => setBijlage(null)} />
              </>
            ) : (
              <Button small title="Bestand kiezen (max 4 MB)" variant="secondary" onPress={kies} />
            )}
          </View>
          {formError && <Text style={styles.error}>{formError}</Text>}
          <Button title="Opslaan" onPress={handleCreate} loading={saving} disabled={!titel} />
        </Card>
      )}

      {materialen.length === 0 ? (
        <Empty icon="folder-open-outline" text="Nog geen studiemateriaal." />
      ) : (
        materialen.map((m) => (
          <Card key={m.id}>
            <Text style={styles.title}>{m.titel}</Text>
            <Muted>
              {[m.klas?.naam, m.vak?.naam, m.docent.name, fmtDatum(m.createdAt)].filter(Boolean).join(" · ")}
            </Muted>
            {m.beschrijving ? <LinkText style={styles.beschrijving}>{m.beschrijving}</LinkText> : null}
            {m.linkUrl ? (
              <Text style={styles.link} onPress={() => Linking.openURL(m.linkUrl!)}>🔗 {m.linkUrl}</Text>
            ) : null}
            {m.hasBijlage ? (
              <Text style={styles.link} onPress={() => openAttachment("studiemateriaal", m.id)}>📎 {m.bijlageNaam ?? "Bijlage openen"}</Text>
            ) : null}
            {canManage && (
              <View style={{ marginTop: 6 }}>
                <Button small title="Verwijderen" variant="ghost" onPress={() => confirmDelete(m)} />
              </View>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  beschrijving: { fontSize: 14, color: colors.text, marginTop: 6 },
  link: { color: colors.info, fontSize: 14, textDecorationLine: "underline", marginTop: 6 },
  bijlageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
  error: { color: colors.danger, marginBottom: 8 },
});

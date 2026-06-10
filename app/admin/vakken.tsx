import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect } from "../../components/ui";
import { colors, CATEGORIE_LABELS } from "../../lib/theme";

interface Vak {
  id: string;
  naam: string;
  beschrijving: string | null;
  categorie: string;
  _count: { klassen: number };
}

const CATEGORIEEN = ["HIFZ", "TAJWEED", "ARABISCH", "FIQH", "SIRA", "OVERIG"];

export default function AdminVakken() {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Vak[]>("/api/vakken");

  const [showForm, setShowForm] = useState(false);
  const [naam, setNaam] = useState("");
  const [categorie, setCategorie] = useState<string | null>(null);
  const [beschrijving, setBeschrijving] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const vakken = data ?? [];

  async function handleCreate() {
    if (!naam || !categorie) return;
    setSaving(true);
    setFormError(null);
    try {
      await api("/api/vakken", {
        method: "POST",
        body: JSON.stringify({ naam, categorie, beschrijving: beschrijving || undefined }),
      });
      setNaam("");
      setBeschrijving("");
      setCategorie(null);
      setShowForm(false);
      await reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Kon vak niet aanmaken");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Button
        title={showForm ? "Formulier sluiten" : "+ Nieuw vak"}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm(!showForm)}
      />

      {showForm && (
        <Card>
          <Input label="Naam *" value={naam} onChangeText={setNaam} placeholder="bijv. Tajweed niveau 1" />
          <ChipSelect
            label="Categorie *"
            options={CATEGORIEEN.map((c) => ({ value: c, label: CATEGORIE_LABELS[c] ?? c }))}
            value={categorie}
            onChange={setCategorie}
          />
          <Input label="Beschrijving" value={beschrijving} onChangeText={setBeschrijving} />
          {formError && <Text style={styles.error}>{formError}</Text>}
          <Button title="Vak aanmaken" onPress={handleCreate} loading={saving} disabled={!naam || !categorie} />
        </Card>
      )}

      {vakken.length === 0 ? (
        <Empty text="Nog geen vakken." />
      ) : (
        vakken.map((v) => (
          <Card key={v.id}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{v.naam}</Text>
                <Muted>
                  {v._count.klassen} klas{v._count.klassen === 1 ? "" : "sen"}
                  {v.beschrijving ? ` · ${v.beschrijving}` : ""}
                </Muted>
              </View>
              <Badge text={CATEGORIE_LABELS[v.categorie] ?? v.categorie} />
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

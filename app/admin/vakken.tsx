import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { bevestig } from "../../lib/confirm";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect } from "../../components/ui";
import { colors } from "../../lib/theme";
import { useT } from "../../lib/LanguageContext";
import { row } from "../../lib/rtl";

interface Vak {
  id: string;
  naam: string;
  beschrijving: string | null;
  categorie: string;
  _count: { klassen: number };
}

const CATEGORIEEN = ["HIFZ", "TAJWEED", "ARABISCH", "FIQH", "SIRA", "OVERIG"];

export default function AdminVakken() {
  const { t, tel, isRTL, label } = useT();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Vak[]>("/api/vakken");

  const [showForm, setShowForm] = useState(false);
  const [naam, setNaam] = useState("");
  const [categorie, setCategorie] = useState<string | null>(null);
  const [beschrijving, setBeschrijving] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Bewerken
  const [editId, setEditId] = useState<string | null>(null);
  const [editNaam, setEditNaam] = useState("");
  const [editCategorie, setEditCategorie] = useState<string | null>(null);
  const [editBeschrijving, setEditBeschrijving] = useState("");
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
      setFormError(e instanceof ApiError ? e.message : t("av_aanmaken_mislukt"));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(v: Vak) {
    const isOpen = editId === v.id;
    setEditId(isOpen ? null : v.id);
    setEditError(null);
    if (!isOpen) {
      setEditNaam(v.naam);
      setEditCategorie(v.categorie);
      setEditBeschrijving(v.beschrijving ?? "");
    }
  }

  async function saveEdit(v: Vak) {
    if (!editNaam || !editCategorie) return;
    setBusy(true);
    setEditError(null);
    try {
      await api(`/api/vakken/${v.id}`, {
        method: "PUT",
        body: JSON.stringify({
          naam: editNaam,
          categorie: editCategorie,
          beschrijving: editBeschrijving || undefined,
        }),
      });
      setEditId(null);
      await reload();
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : t("c_opslaan_mislukt"));
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(v: Vak) {
    bevestig(t("av_verwijderen_titel"), t("c_archiveren_vraag", { naam: v.naam }), async () => {
      setBusy(true);
      setEditError(null);
      try {
        await api(`/api/vakken/${v.id}`, { method: "DELETE" });
        setEditId(null);
        await reload();
      } catch (e) {
        setEditError(e instanceof ApiError ? e.message : t("c_verwijderen_mislukt"));
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Button
        title={showForm ? t("sm_form_sluiten") : t("av_nieuw_vak")}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm(!showForm)}
      />

      {showForm && (
        <Card>
          <Input label={t("c_naam_verplicht")} value={naam} onChangeText={setNaam} placeholder={t("av_naam_ph")} />
          <ChipSelect
            label={t("av_categorie_verplicht")}
            options={CATEGORIEEN.map((c) => ({ value: c, label: label("categorie", c) }))}
            value={categorie}
            onChange={setCategorie}
          />
          <Input label={t("c_beschrijving")} value={beschrijving} onChangeText={setBeschrijving} />
          {formError && <Text style={styles.error}>{formError}</Text>}
          <Button title={t("av_vak_aanmaken")} onPress={handleCreate} loading={saving} disabled={!naam || !categorie} />
        </Card>
      )}

      {vakken.length === 0 ? (
        <Empty text={t("av_geen")} />
      ) : (
        vakken.map((v) => {
          const expanded = editId === v.id;
          return (
            <Card key={v.id}>
              {/* Alleen de kop-rij toggle't — anders klapt de kaart op web dicht bij klikken in het formulier */}
              <Pressable onPress={() => openEdit(v)} style={[styles.row, { flexDirection: row(isRTL) }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{v.naam}</Text>
                  <Muted>
                    {tel("c_n_klassen", v._count.klassen)}
                    {v.beschrijving ? ` · ${v.beschrijving}` : ""}
                  </Muted>
                </View>
                <Badge text={label("categorie", v.categorie)} />
              </Pressable>

              {expanded && (
                <View style={styles.detail}>
                  <Input label={t("c_naam")} value={editNaam} onChangeText={setEditNaam} />
                  <ChipSelect
                    label={t("c_categorie")}
                    options={CATEGORIEEN.map((c) => ({ value: c, label: label("categorie", c) }))}
                    value={editCategorie}
                    onChange={setEditCategorie}
                  />
                  <Input label={t("c_beschrijving")} value={editBeschrijving} onChangeText={setEditBeschrijving} />
                  {editError && <Text style={styles.error}>{editError}</Text>}
                  <View style={[styles.btnRow, { flexDirection: row(isRTL) }]}>
                    <Button small title={t("c_opslaan")} onPress={() => saveEdit(v)} loading={busy} disabled={!editNaam || !editCategorie} />
                    <Button small title={t("c_verwijderen")} variant="danger" onPress={() => confirmDelete(v)} />
                  </View>
                </View>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  btnRow: { gap: 8, flexWrap: "wrap" },
  error: { color: colors.danger, marginBottom: 8 },
});

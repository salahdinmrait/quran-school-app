import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useFetch } from "../lib/useFetch";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Screen, Loading, ErrorView, Card, Muted, Empty, Button, Input } from "./ui";
import { LinkText } from "./LinkText";
import { colors, ROLE_LABELS } from "../lib/theme";
import { fmtDatumTijd } from "../lib/format";

interface Notitie {
  id: string;
  titel: string | null;
  inhoud: string;
  createdAt: string;
  auteur: { id: string; name: string; role: string };
}

interface Dossier {
  leerling: { id: string; name: string } | null;
  notities: Notitie[];
}

// Gedeeld leerlingendossier — gebruikt door docent en admin. Notities blijven bij
// de leerling; latere docenten zien wat eerdere docenten schreven en kunnen aanvullen.
export function LeerlingDossierView({ leerlingId, leerlingNaam }: { leerlingId: string; leerlingNaam?: string }) {
  const { user } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Dossier>(
    `/api/leerling-dossier?leerlingId=${encodeURIComponent(leerlingId)}`
  );

  const [titel, setTitel] = useState("");
  const [inhoud, setInhoud] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const notities = data?.notities ?? [];
  const naam = data?.leerling?.name ?? leerlingNaam ?? "Leerling";

  async function toevoegen() {
    if (!inhoud.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      await api("/api/leerling-dossier", {
        method: "POST",
        body: JSON.stringify({ leerlingId, titel: titel.trim() || null, inhoud: inhoud.trim() }),
      });
      setTitel("");
      setInhoud("");
      await reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  function verwijder(n: Notitie) {
    Alert.alert("Notitie verwijderen", "Deze notitie verwijderen?", [
      { text: "Annuleren", style: "cancel" },
      {
        text: "Verwijderen",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/leerling-dossier?id=${n.id}`, { method: "DELETE" });
            await reload();
          } catch { /* noop */ }
        },
      },
    ]);
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Text style={styles.naam}>{naam}</Text>
      <Muted style={{ marginBottom: 12 }}>Leerlingendossier — zichtbaar voor docenten van deze leerling en het beheer.</Muted>

      {/* Nieuwe notitie */}
      <Card>
        <Input label="Titel (optioneel)" value={titel} onChangeText={setTitel} placeholder="bijv. Gedrag, voortgang, bijzonderheid" />
        <Input label="Notitie *" value={inhoud} onChangeText={setInhoud} multiline placeholder="Schrijf hier je observatie of toevoeging..." />
        {formError && <Text style={styles.error}>{formError}</Text>}
        <Button title="Notitie toevoegen" onPress={toevoegen} loading={saving} disabled={!inhoud.trim()} />
      </Card>

      {notities.length === 0 ? (
        <Empty icon="document-text-outline" text="Nog geen notities in dit dossier." />
      ) : (
        notities.map((n) => {
          const eigen = n.auteur.id === user?.id;
          return (
            <Card key={n.id}>
              {n.titel ? <Text style={styles.titel}>{n.titel}</Text> : null}
              <LinkText style={styles.inhoud}>{n.inhoud}</LinkText>
              <View style={styles.metaRow}>
                <Muted>
                  {n.auteur.name} ({ROLE_LABELS[n.auteur.role] ?? n.auteur.role}) · {fmtDatumTijd(n.createdAt)}
                </Muted>
                {(eigen || user?.role === "ADMIN") && (
                  <Text style={styles.verwijder} onPress={() => verwijder(n)}>Verwijderen</Text>
                )}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  naam: { fontSize: 22, fontWeight: "700", color: colors.text },
  titel: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 2 },
  inhoud: { fontSize: 14, color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 },
  verwijder: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  error: { color: colors.danger, marginBottom: 8 },
});

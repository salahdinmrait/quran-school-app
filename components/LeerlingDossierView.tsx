import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { bevestig } from "../lib/confirm";
import { useFetch } from "../lib/useFetch";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/LanguageContext";
import { row, textStart } from "../lib/rtl";
import { Screen, Loading, ErrorView, Card, Muted, Empty, Button, Input } from "./ui";
import { LinkText } from "./LinkText";
import { colors } from "../lib/theme";
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
  const { t, isRTL, label } = useT();
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
  const naam = data?.leerling?.name ?? leerlingNaam ?? t("c_leerling");

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
      setFormError(e instanceof ApiError ? e.message : t("c_opslaan_mislukt"));
    } finally {
      setSaving(false);
    }
  }

  function verwijder(n: Notitie) {
    bevestig(t("dos_verwijderen_titel"), t("dos_verwijderen_vraag"), async () => {
      try {
        await api(`/api/leerling-dossier?id=${n.id}`, { method: "DELETE" });
        await reload();
      } catch { /* noop */ }
    });
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Text style={[styles.naam, { textAlign: textStart(isRTL) }]}>{naam}</Text>
      <Muted style={{ marginBottom: 12 }}>{t("dos_uitleg")}</Muted>

      {/* Nieuwe notitie */}
      <Card>
        <Input label={t("dos_titel_optioneel")} value={titel} onChangeText={setTitel} placeholder={t("dos_titel_ph")} />
        <Input label={t("dos_notitie_verplicht")} value={inhoud} onChangeText={setInhoud} multiline placeholder={t("dos_notitie_ph")} />
        {formError && <Text style={[styles.error, { textAlign: textStart(isRTL) }]}>{formError}</Text>}
        <Button title={t("dos_toevoegen")} onPress={toevoegen} loading={saving} disabled={!inhoud.trim()} />
      </Card>

      {notities.length === 0 ? (
        <Empty icon="document-text-outline" text={t("dos_geen")} />
      ) : (
        notities.map((n) => {
          const eigen = n.auteur.id === user?.id;
          return (
            <Card key={n.id}>
              {n.titel ? (
                <Text style={[styles.titel, { textAlign: textStart(isRTL) }]}>{n.titel}</Text>
              ) : null}
              <LinkText style={[styles.inhoud, { textAlign: textStart(isRTL) }]}>{n.inhoud}</LinkText>
              <View style={[styles.metaRow, { flexDirection: row(isRTL) }]}>
                <Muted>
                  {n.auteur.name} ({label("rol", n.auteur.role)}) · {fmtDatumTijd(n.createdAt)}
                </Muted>
                {(eigen || user?.role === "ADMIN") && (
                  <Text style={styles.verwijder} onPress={() => verwijder(n)}>
                    {t("c_verwijderen")}
                  </Text>
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
  metaRow: { alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 },
  verwijder: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  error: { color: colors.danger, marginBottom: 8 },
});

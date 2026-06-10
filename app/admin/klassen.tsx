import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Muted, Empty, Button, Input, ChipSelect } from "../../components/ui";
import { colors } from "../../lib/theme";

interface Klas {
  id: string;
  naam: string;
  beschrijving: string | null;
  _count: { leerlingen: number; docenten: number; vakken: number };
}

interface Gebruiker {
  id: string;
  name: string;
  role: string;
}

interface Vak {
  id: string;
  naam: string;
}

export default function AdminKlassen() {
  const kl = useFetch<Klas[]>("/api/klassen");
  const gb = useFetch<Gebruiker[]>("/api/gebruikers");
  const vk = useFetch<Vak[]>("/api/vakken");

  const [showForm, setShowForm] = useState(false);
  const [naam, setNaam] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Koppel-state per geopende klas
  const [openId, setOpenId] = useState<string | null>(null);
  const [koppelType, setKoppelType] = useState<"LEERLING" | "DOCENT" | "VAK">("LEERLING");
  const [koppelId, setKoppelId] = useState<string | null>(null);
  const [koppelBusy, setKoppelBusy] = useState(false);
  const [koppelMsg, setKoppelMsg] = useState<string | null>(null);

  if (kl.loading) return <Loading />;
  if (kl.error) return <ErrorView message={kl.error} onRetry={kl.reload} />;

  const klassen = kl.data ?? [];
  const leerlingen = (gb.data ?? []).filter((g) => g.role === "LEERLING");
  const docenten = (gb.data ?? []).filter((g) => g.role === "DOCENT");
  const vakken = vk.data ?? [];

  async function handleCreate() {
    if (!naam) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/klassen", {
        method: "POST",
        body: JSON.stringify({ naam, beschrijving: beschrijving || undefined }),
      });
      setNaam("");
      setBeschrijving("");
      setShowForm(false);
      await kl.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kon klas niet aanmaken");
    } finally {
      setSaving(false);
    }
  }

  async function handleKoppel(klasId: string) {
    if (!koppelId) return;
    setKoppelBusy(true);
    setKoppelMsg(null);
    try {
      if (koppelType === "LEERLING") {
        await api(`/api/klassen/${klasId}/leerlingen`, {
          method: "POST",
          body: JSON.stringify({ leerlingId: koppelId }),
        });
      } else if (koppelType === "DOCENT") {
        await api(`/api/klassen/${klasId}/docenten`, {
          method: "POST",
          body: JSON.stringify({ docentId: koppelId }),
        });
      } else {
        await api(`/api/klassen/${klasId}/vakken`, {
          method: "POST",
          body: JSON.stringify({ vakId: koppelId }),
        });
      }
      setKoppelMsg("Gekoppeld ✓");
      setKoppelId(null);
      await kl.reload();
    } catch (e) {
      setKoppelMsg(e instanceof ApiError ? e.message : "Koppelen mislukt");
    } finally {
      setKoppelBusy(false);
    }
  }

  const koppelOptions =
    koppelType === "LEERLING"
      ? leerlingen.map((l) => ({ value: l.id, label: l.name }))
      : koppelType === "DOCENT"
      ? docenten.map((d) => ({ value: d.id, label: d.name }))
      : vakken.map((v) => ({ value: v.id, label: v.naam }));

  return (
    <Screen refreshing={kl.refreshing} onRefresh={kl.refresh}>
      <Button
        title={showForm ? "Formulier sluiten" : "+ Nieuwe klas"}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm(!showForm)}
      />

      {showForm && (
        <Card>
          <Input label="Naam *" value={naam} onChangeText={setNaam} placeholder="bijv. Klas 1A" />
          <Input label="Beschrijving" value={beschrijving} onChangeText={setBeschrijving} />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Klas aanmaken" onPress={handleCreate} loading={saving} disabled={!naam} />
        </Card>
      )}

      {klassen.length === 0 ? (
        <Empty text="Nog geen klassen." />
      ) : (
        klassen.map((k) => {
          const expanded = openId === k.id;
          return (
            <Card
              key={k.id}
              onPress={() => {
                setOpenId(expanded ? null : k.id);
                setKoppelMsg(null);
                setKoppelId(null);
              }}
            >
              <Text style={styles.title}>{k.naam}</Text>
              <Muted>
                {k._count.leerlingen} leerlingen · {k._count.docenten} docenten · {k._count.vakken} vakken
              </Muted>
              {k.beschrijving ? <Muted style={{ marginTop: 2 }}>{k.beschrijving}</Muted> : null}

              {expanded && (
                <View style={styles.detail}>
                  <Text style={styles.subTitle}>Koppelen aan deze klas</Text>
                  <ChipSelect<"LEERLING" | "DOCENT" | "VAK">
                    options={[
                      { value: "LEERLING", label: "Leerling" },
                      { value: "DOCENT", label: "Docent" },
                      { value: "VAK", label: "Vak" },
                    ]}
                    value={koppelType}
                    onChange={(v) => {
                      setKoppelType(v);
                      setKoppelId(null);
                    }}
                  />
                  {koppelOptions.length === 0 ? (
                    <Muted>Geen opties beschikbaar.</Muted>
                  ) : (
                    <ChipSelect options={koppelOptions} value={koppelId} onChange={setKoppelId} />
                  )}
                  {koppelMsg && <Text style={styles.koppelMsg}>{koppelMsg}</Text>}
                  <Button
                    small
                    title="Koppelen"
                    onPress={() => handleKoppel(k.id)}
                    loading={koppelBusy}
                    disabled={!koppelId}
                  />
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
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  subTitle: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  error: { color: colors.danger, marginBottom: 8 },
  koppelMsg: { color: colors.primaryDark, fontSize: 13, marginBottom: 4 },
});

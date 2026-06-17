import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect, CheckRow } from "../../components/ui";
import { colors, ROLE_LABELS } from "../../lib/theme";

interface Gebruiker {
  id: string;
  name: string;
  email: string;
  role: string;
  actief: boolean;
  isVolwassen?: boolean;
}

interface Kind {
  id: string;
  name: string;
  email: string;
}

type RoleOption = "ADMIN" | "DOCENT" | "LEERLING" | "OUDER";

export default function AdminGebruikers() {
  const { user: me } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Gebruiker[]>("/api/gebruikers");

  const [filter, setFilter] = useState<string>("ALLE");
  const [zoek, setZoek] = useState("");

  // Nieuw account
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleOption>("LEERLING");
  const [isVolwassen, setIsVolwassen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  // Bewerken
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<RoleOption>("LEERLING");
  const [editActief, setEditActief] = useState(true);
  const [editVolwassen, setEditVolwassen] = useState(false);
  const [nieuwWachtwoord, setNieuwWachtwoord] = useState("");
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editOk, setEditOk] = useState<string | null>(null);

  // Ouder-kind koppeling
  const [kinderen, setKinderen] = useState<Kind[]>([]);
  const [koppelLeerlingId, setKoppelLeerlingId] = useState<string | null>(null);

  const editUser = (data ?? []).find((g) => g.id === editId) ?? null;

  useEffect(() => {
    if (editId && editUser?.role === "OUDER") {
      api<Kind[]>(`/api/ouder/koppeling?ouderId=${editId}`)
        .then(setKinderen)
        .catch(() => setKinderen([]));
    } else {
      setKinderen([]);
    }
    setKoppelLeerlingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, editUser?.role]);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const q = zoek.trim().toLowerCase();
  const gebruikers = (data ?? [])
    .filter((g) => filter === "ALLE" || g.role === filter)
    .filter((g) => !q || g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q));
  const leerlingen = (data ?? []).filter((g) => g.role === "LEERLING");
  const koppelbaar = leerlingen.filter((l) => !kinderen.some((k) => k.id === l.id));

  async function handleCreate() {
    if (!name || !email || password.length < 8) return;
    setSaving(true);
    setFormError(null);
    setCreated(null);
    try {
      await api("/api/gebruikers", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role, isVolwassen: role === "LEERLING" ? isVolwassen : false }),
      });
      setCreated(`Account voor ${name} aangemaakt ✓`);
      setName("");
      setEmail("");
      setPassword("");
      setIsVolwassen(false);
      await reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Kon gebruiker niet aanmaken");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(g: Gebruiker) {
    const isOpen = editId === g.id;
    setEditId(isOpen ? null : g.id);
    setEditError(null);
    setEditOk(null);
    setNieuwWachtwoord("");
    if (!isOpen) {
      setEditName(g.name);
      setEditEmail(g.email);
      setEditRole(g.role as RoleOption);
      setEditActief(g.actief);
      setEditVolwassen(!!g.isVolwassen);
    }
  }

  async function saveEdit(g: Gebruiker) {
    setBusy(true);
    setEditError(null);
    setEditOk(null);
    try {
      await api(`/api/gebruikers/${g.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          actief: editActief,
          isVolwassen: editRole === "LEERLING" ? editVolwassen : false,
          ...(nieuwWachtwoord ? { nieuwWachtwoord } : {}),
        }),
      });
      setEditOk("Opgeslagen ✓");
      setNieuwWachtwoord("");
      await reload();
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "Opslaan mislukt");
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(g: Gebruiker) {
    Alert.alert("Gebruiker verwijderen", `"${g.name}" definitief verwijderen?`, [
      { text: "Annuleren", style: "cancel" },
      {
        text: "Verwijderen",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await api(`/api/gebruikers/${g.id}`, { method: "DELETE" });
            setEditId(null);
            await reload();
          } catch (e) {
            setEditError(e instanceof ApiError ? e.message : "Verwijderen mislukt");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function koppelKind(ouderId: string) {
    if (!koppelLeerlingId) return;
    setBusy(true);
    setEditError(null);
    try {
      await api("/api/ouder/koppeling", {
        method: "POST",
        body: JSON.stringify({ ouderId, leerlingId: koppelLeerlingId }),
      });
      const kind = leerlingen.find((l) => l.id === koppelLeerlingId);
      if (kind) setKinderen((prev) => [...prev, { id: kind.id, name: kind.name, email: kind.email }]);
      setKoppelLeerlingId(null);
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "Koppelen mislukt");
    } finally {
      setBusy(false);
    }
  }

  async function ontkoppelKind(ouderId: string, leerlingId: string) {
    setBusy(true);
    setEditError(null);
    try {
      await api("/api/ouder/koppeling", {
        method: "DELETE",
        body: JSON.stringify({ ouderId, leerlingId }),
      });
      setKinderen((prev) => prev.filter((k) => k.id !== leerlingId));
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "Ontkoppelen mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Button
        title={showForm ? "Formulier sluiten" : "+ Nieuw account"}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm(!showForm)}
      />

      {showForm && (
        <Card>
          <ChipSelect<RoleOption>
            label="Rol"
            options={[
              { value: "LEERLING", label: "Leerling" },
              { value: "OUDER", label: "Ouder" },
              { value: "DOCENT", label: "Docent" },
              { value: "ADMIN", label: "Admin" },
            ]}
            value={role}
            onChange={setRole}
          />
          <Input label="Naam" value={name} onChangeText={setName} />
          <Input label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Wachtwoord (min. 8 tekens)" value={password} onChangeText={setPassword} autoCapitalize="none" />
          {role === "LEERLING" && (
            <CheckRow
              label="18+ zonder ouder-account"
              sublabel="Mag zelf gesprekken starten met docent en beheer"
              checked={isVolwassen}
              onToggle={() => setIsVolwassen(!isVolwassen)}
            />
          )}
          {formError && <Text style={styles.error}>{formError}</Text>}
          {created && <Text style={styles.success}>{created}</Text>}
          <Button
            title="Account aanmaken"
            onPress={handleCreate}
            loading={saving}
            disabled={!name || !email || password.length < 8}
          />
        </Card>
      )}

      <Input label="Zoeken" value={zoek} onChangeText={setZoek} placeholder="Zoek op naam of e-mail..." autoCapitalize="none" />
      <ChipSelect
        label="Filter"
        options={[
          { value: "ALLE", label: "Alle" },
          { value: "LEERLING", label: "Leerlingen" },
          { value: "OUDER", label: "Ouders" },
          { value: "DOCENT", label: "Docenten" },
          { value: "ADMIN", label: "Admins" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {gebruikers.length === 0 ? (
        <Empty text="Geen gebruikers gevonden." />
      ) : (
        gebruikers.map((g) => {
          const expanded = editId === g.id;
          return (
            <Card key={g.id} onPress={() => openEdit(g)}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{g.name}</Text>
                  <Muted>{g.email}</Muted>
                </View>
                <Badge text={ROLE_LABELS[g.role] ?? g.role} />
                {g.role === "LEERLING" && g.isVolwassen && <Badge text="18+" bg={colors.infoLight} fg={colors.info} />}
                {!g.actief && <Badge text="inactief" bg={colors.dangerLight} fg={colors.danger} />}
              </View>

              {expanded && (
                <View style={styles.detail}>
                  <Input label="Naam" value={editName} onChangeText={setEditName} />
                  <Input label="E-mail" value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" />
                  <ChipSelect<RoleOption>
                    label="Rol"
                    options={[
                      { value: "LEERLING", label: "Leerling" },
                      { value: "OUDER", label: "Ouder" },
                      { value: "DOCENT", label: "Docent" },
                      { value: "ADMIN", label: "Admin" },
                    ]}
                    value={editRole}
                    onChange={setEditRole}
                  />
                  <ChipSelect<"actief" | "inactief">
                    label="Status"
                    options={[
                      { value: "actief", label: "Actief" },
                      { value: "inactief", label: "Inactief" },
                    ]}
                    value={editActief ? "actief" : "inactief"}
                    onChange={(v) => setEditActief(v === "actief")}
                  />
                  {editRole === "LEERLING" && (
                    <CheckRow
                      label="18+ zonder ouder-account"
                      sublabel="Mag zelf gesprekken starten"
                      checked={editVolwassen}
                      onToggle={() => setEditVolwassen(!editVolwassen)}
                    />
                  )}
                  <Input
                    label="Nieuw wachtwoord (leeg = niet wijzigen)"
                    value={nieuwWachtwoord}
                    onChangeText={setNieuwWachtwoord}
                    placeholder="min. 8 tekens"
                    autoCapitalize="none"
                  />

                  {/* Ouder: gekoppelde kinderen */}
                  {editUser?.role === "OUDER" && (
                    <View>
                      <Text style={styles.subTitle}>Gekoppelde kinderen</Text>
                      {kinderen.length === 0 ? (
                        <Muted>Nog geen kinderen gekoppeld.</Muted>
                      ) : (
                        kinderen.map((k) => (
                          <View key={k.id} style={styles.kindRow}>
                            <Text style={styles.kindNaam}>{k.name}</Text>
                            <Button small title="Ontkoppelen" variant="ghost" onPress={() => ontkoppelKind(g.id, k.id)} />
                          </View>
                        ))
                      )}
                      {koppelbaar.length > 0 && (
                        <View>
                          <ChipSelect
                            label="Kind koppelen"
                            options={koppelbaar.map((l) => ({ value: l.id, label: l.name }))}
                            value={koppelLeerlingId}
                            onChange={setKoppelLeerlingId}
                          />
                          <Button
                            small
                            title="Koppelen"
                            onPress={() => koppelKind(g.id)}
                            loading={busy}
                            disabled={!koppelLeerlingId}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {editError && <Text style={styles.error}>{editError}</Text>}
                  {editOk && <Text style={styles.success}>{editOk}</Text>}

                  <View style={styles.btnRow}>
                    <Button
                      small
                      title="Opslaan"
                      onPress={() => saveEdit(g)}
                      loading={busy}
                      disabled={editName.length < 2 || !editEmail || (nieuwWachtwoord.length > 0 && nieuwWachtwoord.length < 8)}
                    />
                    {g.id !== me?.id && (
                      <Button small title="Verwijderen" variant="danger" onPress={() => confirmDelete(g)} />
                    )}
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
  row: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  subTitle: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: 4, marginBottom: 4 },
  kindRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 2,
  },
  kindNaam: { fontSize: 14, color: colors.text },
  btnRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  error: { color: colors.danger, marginBottom: 8 },
  success: { color: colors.primaryDark, marginBottom: 8 },
});

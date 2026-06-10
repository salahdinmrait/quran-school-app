import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect } from "../../components/ui";
import { colors, ROLE_LABELS } from "../../lib/theme";

interface Gebruiker {
  id: string;
  name: string;
  email: string;
  role: string;
  actief: boolean;
}

type RoleOption = "ADMIN" | "DOCENT" | "LEERLING" | "OUDER";

export default function AdminGebruikers() {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Gebruiker[]>("/api/gebruikers");

  const [filter, setFilter] = useState<string>("ALLE");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleOption>("LEERLING");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const gebruikers = (data ?? []).filter((g) => filter === "ALLE" || g.role === filter);

  async function handleCreate() {
    if (!name || !email || password.length < 8) return;
    setSaving(true);
    setFormError(null);
    setCreated(null);
    try {
      await api("/api/gebruikers", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setCreated(`Account voor ${name} aangemaakt ✓`);
      setName("");
      setEmail("");
      setPassword("");
      await reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Kon gebruiker niet aanmaken");
    } finally {
      setSaving(false);
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
        gebruikers.map((g) => (
          <Card key={g.id}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{g.name}</Text>
                <Muted>{g.email}</Muted>
              </View>
              <Badge text={ROLE_LABELS[g.role] ?? g.role} />
              {!g.actief && <Badge text="inactief" bg={colors.dangerLight} fg={colors.danger} />}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  error: { color: colors.danger, marginBottom: 8 },
  success: { color: colors.primaryDark, marginBottom: 8 },
});

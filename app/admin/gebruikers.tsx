import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { bevestig } from "../../lib/confirm";
import { useRouter } from "expo-router";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect } from "../../components/ui";
import { PersonPicker } from "../../components/PersonPicker";
import { colors } from "../../lib/theme";
import { useT } from "../../lib/LanguageContext";
import { row } from "../../lib/rtl";

interface Gebruiker {
  id: string;
  name: string;
  email: string;
  role: string;
  telefoon?: string | null;
  actief: boolean;
}

interface Kind {
  id: string;
  name: string;
  email: string;
}

type RoleOption = "ADMIN" | "DOCENT" | "LEERLING" | "OUDER";

export default function AdminGebruikers() {
  const router = useRouter();
  const { t, tel, isRTL, label } = useT();
  const { user: me } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Gebruiker[]>("/api/gebruikers");

  const [filter, setFilter] = useState<string>("ALLE");
  const [zoek, setZoek] = useState("");

  // Nieuw account
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleOption>("LEERLING");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  // Bewerken
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelefoon, setEditTelefoon] = useState("");
  const [editRole, setEditRole] = useState<RoleOption>("LEERLING");
  const [editActief, setEditActief] = useState(true);
  const [nieuwWachtwoord, setNieuwWachtwoord] = useState("");
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editOk, setEditOk] = useState<string | null>(null);

  // Ouder-kind koppeling
  const [kinderen, setKinderen] = useState<Kind[]>([]);
  const [koppelIds, setKoppelIds] = useState<string[]>([]);

  const editUser = (data ?? []).find((g) => g.id === editId) ?? null;

  useEffect(() => {
    if (editId && editUser?.role === "OUDER") {
      api<Kind[]>(`/api/ouder/koppeling?ouderId=${editId}`)
        .then(setKinderen)
        .catch(() => setKinderen([]));
    } else {
      setKinderen([]);
    }
    setKoppelIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, editUser?.role]);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const q = zoek.trim().toLowerCase();
  const gebruikers = (data ?? [])
    .filter((g) => filter === "ALLE" || g.role === filter)
    .filter((g) => !q || g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q));
  const leerlingen = (data ?? []).filter((g) => g.role === "LEERLING");

  // Koppelbaar = elke leerling die nog niet aan deze ouder hangt. Het zoeken
  // zelf doet PersonPicker: zonder zoekterm verschijnt er niets, dus ook bij
  // honderden leerlingen blijft het scherm rustig.
  const koppelbaar = leerlingen.filter((l) => !kinderen.some((k) => k.id === l.id));
  const koppelSelectie = koppelIds
    .map((id) => leerlingen.find((l) => l.id === id))
    .filter((l): l is Gebruiker => !!l);

  async function handleCreate() {
    if (!name || !email || password.length < 8) return;
    setSaving(true);
    setFormError(null);
    setCreated(null);
    try {
      await api("/api/gebruikers", {
        method: "POST",
        body: JSON.stringify({ name, email, telefoon: telefoon || null, password, role }),
      });
      setCreated(t("ag_aangemaakt", { naam: name }));
      setName("");
      setEmail("");
      setTelefoon("");
      setPassword("");
      await reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : t("ag_aanmaken_mislukt"));
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
      setEditTelefoon(g.telefoon ?? "");
      setEditRole(g.role as RoleOption);
      setEditActief(g.actief);
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
          telefoon: editTelefoon || null,
          role: editRole,
          actief: editActief,
          ...(nieuwWachtwoord ? { nieuwWachtwoord } : {}),
        }),
      });
      setEditOk(t("ag_opgeslagen"));
      setNieuwWachtwoord("");
      await reload();
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : t("c_opslaan_mislukt"));
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(g: Gebruiker) {
    bevestig(t("ag_verwijderen_titel"), t("c_archiveren_vraag", { naam: g.name }), async () => {
      setBusy(true);
      try {
        await api(`/api/gebruikers/${g.id}`, { method: "DELETE" });
        setEditId(null);
        await reload();
      } catch (e) {
        setEditError(e instanceof ApiError ? e.message : t("c_verwijderen_mislukt"));
      } finally {
        setBusy(false);
      }
    });
  }

  async function koppelKind(ouderId: string) {
    if (koppelIds.length === 0) return;
    setBusy(true);
    setEditError(null);
    setEditOk(null);

    // Per kind apart: één kind kan al aan een andere ouder hangen (409) en dat
    // mag de rest van de selectie niet blokkeren.
    const gelukt: Kind[] = [];
    const mislukt: string[] = [];
    for (const kind of koppelSelectie) {
      try {
        await api("/api/ouder/koppeling", {
          method: "POST",
          body: JSON.stringify({ ouderId, leerlingId: kind.id }),
        });
        gelukt.push({ id: kind.id, name: kind.name, email: kind.email });
      } catch (e) {
        mislukt.push(`${kind.name}: ${e instanceof ApiError ? e.message : t("ag_koppelen_mislukt")}`);
      }
    }

    if (gelukt.length > 0) {
      setKinderen((prev) => [...prev, ...gelukt].sort((a, b) => a.name.localeCompare(b.name)));
      setEditOk(tel("ag_gekoppeld", gelukt.length));
    }
    setKoppelIds(mislukt.length > 0 ? koppelIds.filter((id) => !gelukt.some((g) => g.id === id)) : []);
    if (mislukt.length > 0) setEditError(mislukt.join("\n"));
    setBusy(false);
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
      setEditError(e instanceof ApiError ? e.message : t("ag_ontkoppelen_mislukt"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Button
        title={showForm ? t("sm_form_sluiten") : t("ag_nieuw_account")}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm(!showForm)}
      />
      <Button
        small
        title={`🗃️ ${t("ag_archief_knop")}`}
        variant="ghost"
        onPress={() => router.push("/admin/archief")}
      />

      {showForm && (
        <Card>
          <ChipSelect<RoleOption>
            label={t("c_rol")}
            options={[
              { value: "LEERLING", label: label("rol", "LEERLING") },
              { value: "OUDER", label: label("rol", "OUDER") },
              { value: "DOCENT", label: label("rol", "DOCENT") },
              { value: "ADMIN", label: label("rol", "ADMIN") },
            ]}
            value={role}
            onChange={setRole}
          />
          <Input label={t("c_naam")} value={name} onChangeText={setName} />
          <Input label={t("c_email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Input label={t("c_telefoon_optioneel")} value={telefoon} onChangeText={setTelefoon} keyboardType="phone-pad" />
          <Input label={t("ag_wachtwoord_min")} value={password} onChangeText={setPassword} autoCapitalize="none" />
          {formError && <Text style={styles.error}>{formError}</Text>}
          {created && <Text style={styles.success}>{created}</Text>}
          <Button
            title={t("ag_account_aanmaken")}
            onPress={handleCreate}
            loading={saving}
            disabled={!name || !email || password.length < 8}
          />
        </Card>
      )}

      <Input label={t("c_zoeken")} value={zoek} onChangeText={setZoek} placeholder={t("c_zoek_naam_email")} autoCapitalize="none" />
      <ChipSelect
        label={t("c_filter")}
        options={[
          { value: "ALLE", label: t("c_alle") },
          { value: "LEERLING", label: t("c_leerlingen") },
          { value: "OUDER", label: t("c_ouders") },
          { value: "DOCENT", label: t("c_docenten") },
          { value: "ADMIN", label: t("c_admins") },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {gebruikers.length === 0 ? (
        <Empty text={t("ag_geen_gebruikers")} />
      ) : (
        gebruikers.map((g) => {
          const expanded = editId === g.id;
          return (
            <Card key={g.id}>
              {/* Alleen de kop-rij toggle't — anders klapt de kaart op web dicht bij klikken in het formulier */}
              <Pressable onPress={() => openEdit(g)} style={[styles.row, { flexDirection: row(isRTL) }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{g.name}</Text>
                  <Muted>{g.email}</Muted>
                </View>
                <Badge text={label("rol", g.role)} />
                {!g.actief && <Badge text={t("c_inactief")} bg={colors.dangerLight} fg={colors.danger} />}
              </Pressable>

              {expanded && (
                <View style={styles.detail}>
                  <Input label={t("c_naam")} value={editName} onChangeText={setEditName} />
                  <Input label={t("c_email")} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" />
                  <Input label={t("c_telefoon_optioneel")} value={editTelefoon} onChangeText={setEditTelefoon} keyboardType="phone-pad" />
                  <ChipSelect<RoleOption>
                    label={t("c_rol")}
                    options={[
                      { value: "LEERLING", label: label("rol", "LEERLING") },
                      { value: "OUDER", label: label("rol", "OUDER") },
                      { value: "DOCENT", label: label("rol", "DOCENT") },
                      { value: "ADMIN", label: label("rol", "ADMIN") },
                    ]}
                    value={editRole}
                    onChange={setEditRole}
                  />
                  <ChipSelect<"actief" | "inactief">
                    label={t("c_status")}
                    options={[
                      { value: "actief", label: t("c_actief") },
                      { value: "inactief", label: t("c_inactief") },
                    ]}
                    value={editActief ? "actief" : "inactief"}
                    onChange={(v) => setEditActief(v === "actief")}
                  />
                  <Input
                    label={t("ag_nieuw_ww")}
                    value={nieuwWachtwoord}
                    onChangeText={setNieuwWachtwoord}
                    placeholder={t("ag_min8")}
                    autoCapitalize="none"
                  />

                  {/* Ouder: gekoppelde kinderen */}
                  {editUser?.role === "OUDER" && (
                    <View>
                      <Text style={styles.subTitle}>{t("ag_gekoppelde_kinderen")}</Text>
                      {kinderen.length === 0 ? (
                        <Muted>{t("ag_geen_kinderen")}</Muted>
                      ) : (
                        kinderen.map((k) => (
                          <View key={k.id} style={[styles.kindRow, { flexDirection: row(isRTL) }]}>
                            <Text style={styles.kindNaam}>{k.name}</Text>
                            <Button small title={t("ag_ontkoppelen")} variant="ghost" onPress={() => ontkoppelKind(g.id, k.id)} />
                          </View>
                        ))
                      )}
                      <View>
                        <PersonPicker
                          label={t("ag_kind_koppelen")}
                          personen={koppelbaar}
                          geselecteerd={koppelIds}
                          onChange={setKoppelIds}
                          placeholder={t("c_zoek_naam_email")}
                          leegTekst={t("ag_geen_leerling")}
                        />
                        <Button
                          small
                          title={
                            koppelSelectie.length > 1
                              ? tel("ag_koppelen", koppelSelectie.length)
                              : t("ag_koppelen_een")
                          }
                          onPress={() => koppelKind(g.id)}
                          loading={busy}
                          disabled={koppelSelectie.length === 0}
                        />
                      </View>
                    </View>
                  )}

                  {g.role === "LEERLING" && (
                    <Button
                      small
                      title={`📋 ${t("ag_dossier_openen")}`}
                      variant="secondary"
                      onPress={() => router.push(`/admin/leerling-dossier?leerlingId=${g.id}&naam=${encodeURIComponent(g.name)}`)}
                    />
                  )}

                  {editError && <Text style={styles.error}>{editError}</Text>}
                  {editOk && <Text style={styles.success}>{editOk}</Text>}

                  <View style={[styles.btnRow, { flexDirection: row(isRTL) }]}>
                    <Button
                      small
                      title={t("c_opslaan")}
                      onPress={() => saveEdit(g)}
                      loading={busy}
                      disabled={editName.length < 2 || !editEmail || (nieuwWachtwoord.length > 0 && nieuwWachtwoord.length < 8)}
                    />
                    {g.id !== me?.id && (
                      <Button small title={t("c_verwijderen")} variant="danger" onPress={() => confirmDelete(g)} />
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
  row: { alignItems: "center", gap: 6, flexWrap: "wrap" },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  subTitle: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: 4, marginBottom: 4 },
  kindRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 2,
  },
  kindNaam: { fontSize: 14, color: colors.text },
  btnRow: { gap: 8, flexWrap: "wrap", marginTop: 4 },
  error: { color: colors.danger, marginBottom: 8 },
  success: { color: colors.primaryDark, marginBottom: 8 },
});

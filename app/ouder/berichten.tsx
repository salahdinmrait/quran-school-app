import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect } from "../../components/ui";
import { colors, ROLE_LABELS } from "../../lib/theme";
import { fmtDatumTijd } from "../../lib/format";

interface Bericht {
  id: string;
  onderwerp: string;
  inhoud: string;
  gelezen: boolean;
  createdAt: string;
  verzender?: { id: string; name: string; role: string };
  ontvanger?: { id: string; name: string; role: string };
}

interface Kind {
  id: string;
  name: string;
  leerlingKlassen: {
    klas: { docenten: { docent: { id: string; name: string } }[] };
  }[];
}

type Tab = "inbox" | "verzonden" | "nieuw";

export default function OuderBerichten() {
  const { data, setData, error, loading, refreshing, refresh, reload } =
    useFetch<{ inbox: Bericht[]; verzonden: Bericht[] }>("/api/ouder/berichten");
  const kinderen = useFetch<Kind[]>("/api/ouder/kind");

  const [tab, setTab] = useState<Tab>("inbox");
  const [openId, setOpenId] = useState<string | null>(null);
  const [docentId, setDocentId] = useState<string | null>(null);
  const [onderwerp, setOnderwerp] = useState("");
  const [inhoud, setInhoud] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const inbox = data?.inbox ?? [];
  const verzonden = data?.verzonden ?? [];

  // Alle docenten van de kinderen (gededupliceerd)
  const docenten = Array.from(
    new Map(
      (kinderen.data ?? [])
        .flatMap((k) => k.leerlingKlassen)
        .flatMap((kk) => kk.klas.docenten)
        .map((d) => [d.docent.id, d.docent])
    ).values()
  );

  function openBericht(b: Bericht) {
    const wasOpen = openId === b.id;
    setOpenId(wasOpen ? null : b.id);
    if (!wasOpen && !b.gelezen && tab === "inbox") {
      api(`/api/berichten/${b.id}`, { method: "PUT" }).catch(() => {});
      setData((prev) =>
        prev
          ? { ...prev, inbox: prev.inbox.map((m) => (m.id === b.id ? { ...m, gelezen: true } : m)) }
          : prev
      );
    }
  }

  async function sendNieuw() {
    if (!docentId || !onderwerp.trim() || !inhoud.trim()) return;
    setSending(true);
    setSendError(null);
    setSent(false);
    try {
      await api("/api/ouder/berichten", {
        method: "POST",
        body: JSON.stringify({
          ontvangerId: docentId,
          onderwerp: onderwerp.trim(),
          inhoud: inhoud.trim(),
        }),
      });
      setSent(true);
      setOnderwerp("");
      setInhoud("");
      refresh();
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : "Versturen mislukt");
    } finally {
      setSending(false);
    }
  }

  function renderBericht(b: Bericht, richting: "in" | "uit") {
    const expanded = openId === b.id;
    const persoon = richting === "in" ? b.verzender : b.ontvanger;
    return (
      <Card key={b.id} onPress={() => openBericht(b)}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, richting === "in" && !b.gelezen && styles.unread]}>
              {b.onderwerp}
            </Text>
            <Muted>
              {richting === "in" ? "Van" : "Aan"}: {persoon?.name}
              {persoon ? ` (${ROLE_LABELS[persoon.role] ?? persoon.role})` : ""} ·{" "}
              {fmtDatumTijd(b.createdAt)}
            </Muted>
          </View>
          {richting === "in" && !b.gelezen && (
            <Badge text="nieuw" bg={colors.infoLight} fg={colors.info} />
          )}
        </View>
        {expanded && <Text style={styles.inhoud}>{b.inhoud}</Text>}
      </Card>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.tabs}>
        {(["inbox", "verzonden", "nieuw"] as Tab[]).map((t) => (
          <Text key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            {t === "inbox"
              ? `Inbox (${inbox.filter((b) => !b.gelezen).length})`
              : t === "verzonden"
              ? "Verzonden"
              : "+ Nieuw"}
          </Text>
        ))}
      </View>

      {tab === "inbox" &&
        (inbox.length === 0 ? (
          <Empty icon="mail-outline" text="Geen berichten ontvangen." />
        ) : (
          inbox.map((b) => renderBericht(b, "in"))
        ))}

      {tab === "verzonden" &&
        (verzonden.length === 0 ? (
          <Empty icon="paper-plane-outline" text="Nog niets verzonden." />
        ) : (
          verzonden.map((b) => renderBericht(b, "uit"))
        ))}

      {tab === "nieuw" && (
        <Card>
          {docenten.length === 0 ? (
            <Muted>
              Geen docenten gevonden — uw kind moet eerst aan een klas met docent gekoppeld zijn.
            </Muted>
          ) : (
            <>
              <ChipSelect
                label="Docent"
                options={docenten.map((d) => ({ value: d.id, label: d.name }))}
                value={docentId}
                onChange={setDocentId}
              />
              <Input label="Onderwerp" value={onderwerp} onChangeText={setOnderwerp} />
              <Input label="Bericht" value={inhoud} onChangeText={setInhoud} multiline />
              {sendError && <Text style={styles.error}>{sendError}</Text>}
              {sent && <Text style={styles.success}>Verstuurd ✓</Text>}
              <Button
                title="Versturen"
                onPress={sendNieuw}
                loading={sending}
                disabled={!docentId || !onderwerp.trim() || !inhoud.trim()}
              />
            </>
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textMuted,
    fontSize: 13,
    overflow: "hidden",
  },
  tabActive: { backgroundColor: colors.primary, color: "#fff", fontWeight: "600", borderColor: colors.primary },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 15, fontWeight: "500", color: colors.text },
  unread: { fontWeight: "700" },
  inhoud: {
    fontSize: 14,
    color: colors.text,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  error: { color: colors.danger, fontSize: 13, marginBottom: 4 },
  success: { color: colors.primaryDark, fontSize: 13, marginBottom: 4 },
});

import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect } from "../../components/ui";
import { LinkText } from "../../components/LinkText";
import { pickBijlage, openAttachment, GekozenBijlage } from "../../lib/bijlage";
import { colors, ROLE_LABELS } from "../../lib/theme";
import { fmtDatumTijd } from "../../lib/format";

interface ThreadMessage {
  id: string;
  inhoud: string;
  createdAt: string;
  verzender: { id: string; name: string; role: string };
}

interface Bericht {
  id: string;
  onderwerp: string;
  inhoud: string;
  gelezen: boolean;
  createdAt: string;
  hasBijlage?: boolean;
  verzender: { id: string; name: string; role: string };
  replies: ThreadMessage[];
  replyTo: ThreadMessage | null;
}

interface Contacten {
  docenten: { id: string; name: string }[];
  admins: { id: string; name: string }[];
}

type Tab = "inbox" | "nieuw";

export default function LeerlingBerichten() {
  const { user } = useAuth();
  const is18 = !!user?.isVolwassen;
  const { data, setData, error, loading, refreshing, refresh, reload } =
    useFetch<{ inbox: Bericht[]; verzonden: unknown[] }>("/api/berichten");
  const contacten = useFetch<Contacten>(is18 ? "/api/leerling/contacten" : null);

  const [tab, setTab] = useState<Tab>("inbox");
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Compose (18+)
  const [contactId, setContactId] = useState<string | null>(null);
  const [onderwerp, setOnderwerp] = useState("");
  const [inhoud, setInhoud] = useState("");
  const [bijlage, setBijlage] = useState<GekozenBijlage | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const inbox = data?.inbox ?? [];
  const contactOpties = [
    ...(contacten.data?.docenten ?? []).map((d) => ({ value: d.id, label: `${d.name} (docent)` })),
    ...(contacten.data?.admins ?? []).map((a) => ({ value: a.id, label: `${a.name} (beheer)` })),
  ];

  async function openBericht(b: Bericht) {
    const wasOpen = openId === b.id;
    setOpenId(wasOpen ? null : b.id);
    setReplyText("");
    setSendError(null);
    if (!wasOpen && !b.gelezen) {
      api(`/api/berichten/${b.id}`, { method: "PUT" }).catch(() => {});
      setData((prev) =>
        prev ? { ...prev, inbox: prev.inbox.map((m) => (m.id === b.id ? { ...m, gelezen: true } : m)) } : prev
      );
    }
  }

  async function sendReply(b: Bericht) {
    if (!replyText.trim() || !user) return;
    setSending(true);
    setSendError(null);
    try {
      await api("/api/berichten", {
        method: "POST",
        body: JSON.stringify({
          onderwerp: b.onderwerp.startsWith("Re:") ? b.onderwerp : `Re: ${b.onderwerp}`,
          inhoud: replyText.trim(),
          doelType: "GEBRUIKERS",
          doelIds: [b.verzender.id],
          replyToId: b.id,
        }),
      });
      const newReply: ThreadMessage = {
        id: `tmp_${Date.now()}`,
        inhoud: replyText.trim(),
        createdAt: new Date().toISOString(),
        verzender: { id: user.id, name: user.name, role: user.role },
      };
      setData((prev) =>
        prev ? { ...prev, inbox: prev.inbox.map((m) => (m.id === b.id ? { ...m, replies: [...m.replies, newReply] } : m)) } : prev
      );
      setReplyText("");
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : "Versturen mislukt");
    } finally {
      setSending(false);
    }
  }

  async function kiesBijlage() {
    setSendError(null);
    const { bijlage: b, error: e } = await pickBijlage();
    if (e) setSendError(e);
    else if (b) setBijlage(b);
  }

  async function sendNieuw() {
    if (!contactId || !onderwerp.trim() || !inhoud.trim()) return;
    setSending(true);
    setSendError(null);
    setSent(null);
    try {
      await api("/api/berichten", {
        method: "POST",
        body: JSON.stringify({
          onderwerp: onderwerp.trim(),
          inhoud: inhoud.trim(),
          doelType: "GEBRUIKERS",
          doelIds: [contactId],
          ...(bijlage ? { bijlageNaam: bijlage.naam, bijlageData: bijlage.data, bijlageType: bijlage.type } : {}),
        }),
      });
      setSent("Bericht verstuurd ✓");
      setOnderwerp(""); setInhoud(""); setBijlage(null); setContactId(null);
      refresh();
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : "Versturen mislukt");
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {is18 && (
        <View style={styles.tabs}>
          {(["inbox", "nieuw"] as Tab[]).map((t) => (
            <Text key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
              {t === "inbox" ? `Inbox (${inbox.filter((b) => !b.gelezen).length})` : "+ Nieuw"}
            </Text>
          ))}
        </View>
      )}

      {tab === "nieuw" && is18 ? (
        <Card>
          <Muted style={{ marginBottom: 8 }}>Start een gesprek met een docent of het beheer.</Muted>
          {contactOpties.length === 0 ? (
            <Muted>Geen contacten gevonden.</Muted>
          ) : (
            <ChipSelect label="Aan" options={contactOpties} value={contactId} onChange={setContactId} />
          )}
          <Input label="Onderwerp" value={onderwerp} onChangeText={setOnderwerp} />
          <Input label="Bericht" value={inhoud} onChangeText={setInhoud} multiline />
          <View style={styles.bijlageRow}>
            {bijlage ? (
              <>
                <Text style={styles.bijlageNaam} numberOfLines={1}>📎 {bijlage.naam}</Text>
                <Button small title="Verwijderen" variant="ghost" onPress={() => setBijlage(null)} />
              </>
            ) : (
              <Button small title="Bestand bijvoegen" variant="secondary" onPress={kiesBijlage} />
            )}
          </View>
          {sendError && <Text style={styles.error}>{sendError}</Text>}
          {sent && <Text style={styles.success}>{sent}</Text>}
          <Button title="Versturen" onPress={sendNieuw} loading={sending} disabled={!contactId || !onderwerp.trim() || !inhoud.trim()} />
        </Card>
      ) : inbox.length === 0 ? (
        <Empty icon="mail-outline" text="Geen berichten." />
      ) : (
        inbox.map((b) => {
          const expanded = openId === b.id;
          return (
            <Card key={b.id}>
              {/* Alleen de kop-rij toggle't — anders klapt de kaart op web dicht bij klikken in het reactieveld */}
              <Pressable onPress={() => openBericht(b)} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, !b.gelezen && styles.unread]}>{b.onderwerp}</Text>
                  <Muted>
                    {b.verzender.name} ({ROLE_LABELS[b.verzender.role] ?? b.verzender.role}) · {fmtDatumTijd(b.createdAt)}
                  </Muted>
                </View>
                {!b.gelezen && <Badge text="nieuw" bg={colors.infoLight} fg={colors.info} />}
                {b.replies.length > 0 && <Badge text={`${b.replies.length} ↩`} bg={colors.primaryLight} fg={colors.primaryDark} />}
              </Pressable>

              {expanded && (
                <View style={styles.detail}>
                  {b.replyTo && (
                    <View style={styles.contextBox}>
                      <Muted>Eerder bericht van {b.replyTo.verzender.name}:</Muted>
                      <Text style={styles.contextText}>{b.replyTo.inhoud}</Text>
                    </View>
                  )}
                  <LinkText style={styles.inhoud}>{b.inhoud}</LinkText>
                  {b.hasBijlage ? (
                    <Text style={styles.bijlageLink} onPress={() => openAttachment("bericht", b.id)}>📎 Bijlage openen</Text>
                  ) : null}
                  {b.replies.map((r) => (
                    <View key={r.id} style={styles.replyBox}>
                      <Muted>{r.verzender.id === user?.id ? "Jij" : r.verzender.name} · {fmtDatumTijd(r.createdAt)}</Muted>
                      <LinkText style={styles.replyText}>{r.inhoud}</LinkText>
                    </View>
                  ))}
                  <View style={styles.replyForm}>
                    <Input value={replyText} onChangeText={setReplyText} placeholder="Schrijf een reactie..." multiline />
                    {sendError && <Text style={styles.error}>{sendError}</Text>}
                    <Button title="Reageren" onPress={() => sendReply(b)} loading={sending} disabled={!replyText.trim()} small />
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
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: {
    flex: 1, textAlign: "center", paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    color: colors.textMuted, fontSize: 13, overflow: "hidden",
  },
  tabActive: { backgroundColor: colors.primary, color: "#fff", fontWeight: "600", borderColor: colors.primary },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 15, fontWeight: "500", color: colors.text },
  unread: { fontWeight: "700" },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  inhoud: { fontSize: 14, color: colors.text, marginBottom: 8 },
  bijlageLink: { color: colors.info, fontSize: 14, textDecorationLine: "underline", marginBottom: 8 },
  contextBox: { backgroundColor: colors.bg, borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: colors.textFaint },
  contextText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  replyBox: { borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 10, marginLeft: 6, marginBottom: 8 },
  replyText: { fontSize: 14, color: colors.text, marginTop: 2 },
  replyForm: { marginTop: 8 },
  bijlageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
  error: { color: colors.danger, fontSize: 13, marginBottom: 4 },
  success: { color: colors.primaryDark, fontSize: 13, marginBottom: 4 },
});

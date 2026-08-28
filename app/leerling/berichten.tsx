import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/LanguageContext";
import { row, textStart } from "../../lib/rtl";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input } from "../../components/ui";
import { LinkText } from "../../components/LinkText";
import { PersonPicker, Persoon } from "../../components/PersonPicker";
import { pickBijlage, openAttachment, GekozenBijlage } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
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
  docenten: { id: string; name: string; email: string }[];
  admins: { id: string; name: string; email: string }[];
}

type Tab = "inbox" | "nieuw";

export default function LeerlingBerichten() {
  const { user } = useAuth();
  const { t, isRTL, label } = useT();
  const { data, setData, error, loading, refreshing, refresh, reload } =
    useFetch<{ inbox: Bericht[]; verzonden: unknown[] }>("/api/berichten");
  // Elke leerling mag een gesprek beginnen — er is geen leeftijdsonderscheid.
  const contacten = useFetch<Contacten>("/api/leerling/contacten");

  const [tab, setTab] = useState<Tab>("inbox");
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Nieuw bericht
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [onderwerp, setOnderwerp] = useState("");
  const [inhoud, setInhoud] = useState("");
  const [bijlage, setBijlage] = useState<GekozenBijlage | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const inbox = data?.inbox ?? [];
  // Docenten en beheer in één zoeklijst; de rol staat achter de naam zodat een
  // leerling ziet wie hij aanschrijft.
  const contactPersonen: Persoon[] = [
    ...(contacten.data?.docenten ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      extra: `${label("rol", "DOCENT")} · ${d.email}`,
    })),
    ...(contacten.data?.admins ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      extra: `${t("c_beheer")} · ${a.email}`,
    })),
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
      setSendError(e instanceof ApiError ? e.message : t("c_versturen_mislukt"));
    } finally {
      setSending(false);
    }
  }

  async function kiesBijlage() {
    setSendError(null);
    const { bijlage: b, fout } = await pickBijlage();
    if (fout) setSendError(t(fout));
    else if (b) setBijlage(b);
  }

  async function sendNieuw() {
    if (contactIds.length === 0 || !onderwerp.trim() || !inhoud.trim()) return;
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
          doelIds: contactIds,
          ...(bijlage ? { bijlageNaam: bijlage.naam, bijlageUrl: bijlage.url, bijlageType: bijlage.type } : {}),
        }),
      });
      setSent(t("lb_verstuurd"));
      setOnderwerp(""); setInhoud(""); setBijlage(null); setContactIds([]);
      refresh();
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : t("c_versturen_mislukt"));
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={[styles.tabs, { flexDirection: row(isRTL) }]}>
        {(["inbox", "nieuw"] as Tab[]).map((naam) => (
          <Text key={naam} onPress={() => setTab(naam)} style={[styles.tab, tab === naam && styles.tabActive]}>
            {naam === "inbox"
              ? t("br_inbox", { count: inbox.filter((b) => !b.gelezen).length })
              : t("br_nieuw")}
          </Text>
        ))}
      </View>

      {tab === "nieuw" ? (
        <Card>
          <Muted style={{ marginBottom: 8 }}>
            {t("lb_uitleg")}
          </Muted>
          <PersonPicker
            label={t("lb_aan")}
            personen={contactPersonen}
            geselecteerd={contactIds}
            onChange={setContactIds}
            leegTekst={t("lb_geen_contacten")}
          />
          <Input label={t("c_onderwerp")} value={onderwerp} onChangeText={setOnderwerp} />
          <Input label={t("c_bericht")} value={inhoud} onChangeText={setInhoud} multiline />
          <View style={[styles.bijlageRow, { flexDirection: row(isRTL) }]}>
            {bijlage ? (
              <>
                <Text style={[styles.bijlageNaam, { textAlign: textStart(isRTL) }]} numberOfLines={1}>
                  📎 {bijlage.naam}
                </Text>
                <Button small title={t("c_verwijderen")} variant="ghost" onPress={() => setBijlage(null)} />
              </>
            ) : (
              <Button small title={t("c_bestand_bijvoegen")} variant="secondary" onPress={kiesBijlage} />
            )}
          </View>
          {sendError && <Text style={[styles.error, { textAlign: textStart(isRTL) }]}>{sendError}</Text>}
          {sent && <Text style={[styles.success, { textAlign: textStart(isRTL) }]}>{sent}</Text>}
          <Button title={t("c_versturen")} onPress={sendNieuw} loading={sending} disabled={contactIds.length === 0 || !onderwerp.trim() || !inhoud.trim()} />
        </Card>
      ) : inbox.length === 0 ? (
        <Empty icon="mail-outline" text={t("lb_geen_berichten")} />
      ) : (
        inbox.map((b) => {
          const expanded = openId === b.id;
          return (
            <Card key={b.id}>
              {/* Alleen de kop-rij toggle't — anders klapt de kaart op web dicht bij klikken in het reactieveld */}
              <Pressable onPress={() => openBericht(b)} style={[styles.row, { flexDirection: row(isRTL) }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, !b.gelezen && styles.unread, { textAlign: textStart(isRTL) }]}>
                    {b.onderwerp}
                  </Text>
                  <Muted>
                    {b.verzender.name} ({label("rol", b.verzender.role)}) · {fmtDatumTijd(b.createdAt)}
                  </Muted>
                </View>
                {!b.gelezen && <Badge text={t("br_badge_nieuw")} bg={colors.infoLight} fg={colors.info} />}
                {b.replies.length > 0 && <Badge text={`${b.replies.length} ↩`} bg={colors.primaryLight} fg={colors.primaryDark} />}
              </Pressable>

              {expanded && (
                <View style={styles.detail}>
                  {b.replyTo && (
                    <View style={styles.contextBox}>
                      <Muted>{t("lb_eerder_van", { naam: b.replyTo.verzender.name })}</Muted>
                      <Text style={[styles.contextText, { textAlign: textStart(isRTL) }]}>{b.replyTo.inhoud}</Text>
                    </View>
                  )}
                  <LinkText style={[styles.inhoud, { textAlign: textStart(isRTL) }]}>{b.inhoud}</LinkText>
                  {b.hasBijlage ? (
                    <Text
                      style={[styles.bijlageLink, { textAlign: textStart(isRTL) }]}
                      onPress={() => openAttachment("bericht", b.id)}
                    >
                      📎 {t("c_bijlage_openen")}
                    </Text>
                  ) : null}
                  {b.replies.map((r) => (
                    <View key={r.id} style={styles.replyBox}>
                      <Muted>
                        {r.verzender.id === user?.id ? t("br_jij") : r.verzender.name} · {fmtDatumTijd(r.createdAt)}
                      </Muted>
                      <LinkText style={[styles.replyText, { textAlign: textStart(isRTL) }]}>{r.inhoud}</LinkText>
                    </View>
                  ))}
                  <View style={styles.replyForm}>
                    <Input value={replyText} onChangeText={setReplyText} placeholder={t("c_reactie_ph")} multiline />
                    {sendError && <Text style={[styles.error, { textAlign: textStart(isRTL) }]}>{sendError}</Text>}
                    <Button title={t("c_reageren")} onPress={() => sendReply(b)} loading={sending} disabled={!replyText.trim()} small />
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
  tabs: { gap: 8, marginBottom: 12 },
  tab: {
    flex: 1, textAlign: "center", paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    color: colors.textMuted, fontSize: 13, overflow: "hidden",
  },
  tabActive: { backgroundColor: colors.primary, color: "#fff", fontWeight: "600", borderColor: colors.primary },
  row: { alignItems: "center", gap: 6 },
  title: { fontSize: 15, fontWeight: "500", color: colors.text },
  unread: { fontWeight: "700" },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  inhoud: { fontSize: 14, color: colors.text, marginBottom: 8 },
  bijlageLink: { color: colors.info, fontSize: 14, textDecorationLine: "underline", marginBottom: 8 },
  contextBox: { backgroundColor: colors.bg, borderRadius: 8, padding: 10, marginBottom: 8, borderStartWidth: 3, borderStartColor: colors.textFaint },
  contextText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  replyBox: { borderStartWidth: 3, borderStartColor: colors.primary, paddingStart: 10, marginStart: 6, marginBottom: 8 },
  replyText: { fontSize: 14, color: colors.text, marginTop: 2 },
  replyForm: { marginTop: 8 },
  bijlageRow: { alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
  error: { color: colors.danger, fontSize: 13, marginBottom: 4 },
  success: { color: colors.primaryDark, fontSize: 13, marginBottom: 4 },
});

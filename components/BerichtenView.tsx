import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../lib/useFetch";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect } from "./ui";
import { colors, ROLE_LABELS } from "../lib/theme";
import { fmtDatumTijd } from "../lib/format";

// Gedeeld berichten-scherm voor DOCENT en ADMIN:
// inbox met threads, verzonden met ontvangen reacties, en opstellen
// (individueel / hele klas leerlingen / alle ouders van klas).

interface ThreadMessage {
  id: string;
  inhoud: string;
  createdAt: string;
  verzender: { id: string; name: string; role: string };
}

interface BerichtIn {
  id: string;
  onderwerp: string;
  inhoud: string;
  gelezen: boolean;
  createdAt: string;
  verzender: { id: string; name: string; role: string };
  replies: ThreadMessage[];
  replyTo: ThreadMessage | null;
}

interface BerichtUit {
  id: string;
  onderwerp: string;
  inhoud: string;
  createdAt: string;
  doelLabel: string | null;
  aantalOntvangers: number;
  ontvanger: { id: string; name: string; role: string } | null;
  replies: ThreadMessage[];
}

interface TargetKlas {
  id: string;
  naam: string;
  leerlingen: { id: string; name: string }[];
  ouders: { id: string; name: string; kindNaam: string }[];
}

type Tab = "inbox" | "verzonden" | "nieuw";
type DoelType = "GEBRUIKERS" | "KLAS_LEERLINGEN" | "KLAS_OUDERS";

export function BerichtenView({ targetsEndpoint }: { targetsEndpoint: string }) {
  const { user } = useAuth();
  const { data, setData, error, loading, refreshing, refresh, reload } =
    useFetch<{ inbox: BerichtIn[]; verzonden: BerichtUit[] }>("/api/berichten");
  const targets = useFetch<TargetKlas[]>(targetsEndpoint);

  const [tab, setTab] = useState<Tab>("inbox");
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Compose state
  const [doelType, setDoelType] = useState<DoelType>("KLAS_LEERLINGEN");
  const [klasId, setKlasId] = useState<string | null>(null);
  const [persoonId, setPersoonId] = useState<string | null>(null);
  const [onderwerp, setOnderwerp] = useState("");
  const [inhoud, setInhoud] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const inbox = data?.inbox ?? [];
  const verzonden = data?.verzonden ?? [];
  const klassen = targets.data ?? [];
  const klas = klassen.find((k) => k.id === klasId) ?? null;

  function openBericht(b: BerichtIn) {
    const wasOpen = openId === b.id;
    setOpenId(wasOpen ? null : b.id);
    setReplyText("");
    setSendError(null);
    if (!wasOpen && !b.gelezen) {
      api(`/api/berichten/${b.id}`, { method: "PUT" }).catch(() => {});
      setData((prev) =>
        prev
          ? { ...prev, inbox: prev.inbox.map((m) => (m.id === b.id ? { ...m, gelezen: true } : m)) }
          : prev
      );
    }
  }

  async function sendReply(b: BerichtIn) {
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
        prev
          ? {
              ...prev,
              inbox: prev.inbox.map((m) =>
                m.id === b.id ? { ...m, replies: [...m.replies, newReply] } : m
              ),
            }
          : prev
      );
      setReplyText("");
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : "Versturen mislukt");
    } finally {
      setSending(false);
    }
  }

  async function sendNieuw() {
    if (!onderwerp.trim() || !inhoud.trim()) return;
    setSending(true);
    setSendError(null);
    setSent(null);
    try {
      const body: Record<string, unknown> = {
        onderwerp: onderwerp.trim(),
        inhoud: inhoud.trim(),
        doelType,
      };
      if (doelType === "GEBRUIKERS") {
        if (!persoonId) {
          setSendError("Kies een ontvanger");
          setSending(false);
          return;
        }
        body.doelIds = [persoonId];
      } else {
        if (!klasId) {
          setSendError("Kies een klas");
          setSending(false);
          return;
        }
        body.doelId = klasId;
      }
      const res = await api<{ count: number }>("/api/berichten", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSent(`Verstuurd naar ${res.count} ontvanger${res.count === 1 ? "" : "s"} ✓`);
      setOnderwerp("");
      setInhoud("");
      refresh();
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : "Versturen mislukt");
    } finally {
      setSending(false);
    }
  }

  const personen =
    doelType === "GEBRUIKERS" && klas
      ? [
          ...klas.leerlingen.map((l) => ({ value: l.id, label: `${l.name} (leerling)` })),
          ...klas.ouders.map((o) => ({ value: o.id, label: `${o.name} (ouder van ${o.kindNaam})` })),
        ]
      : [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.tabs}>
        {(["inbox", "verzonden", "nieuw"] as Tab[]).map((t) => (
          <Text
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            {t === "inbox" ? `Inbox (${inbox.filter((b) => !b.gelezen).length})` : t === "verzonden" ? "Verzonden" : "+ Nieuw"}
          </Text>
        ))}
      </View>

      {tab === "inbox" &&
        (inbox.length === 0 ? (
          <Empty icon="mail-outline" text="Geen berichten ontvangen." />
        ) : (
          inbox.map((b) => {
            const expanded = openId === b.id;
            return (
              <Card key={b.id} onPress={() => openBericht(b)}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, !b.gelezen && styles.unread]}>{b.onderwerp}</Text>
                    <Muted>
                      {b.verzender.name} ({ROLE_LABELS[b.verzender.role] ?? b.verzender.role}) ·{" "}
                      {fmtDatumTijd(b.createdAt)}
                    </Muted>
                  </View>
                  {!b.gelezen && <Badge text="nieuw" bg={colors.infoLight} fg={colors.info} />}
                  {b.replyTo && <Badge text="antwoord" bg={colors.infoLight} fg={colors.info} />}
                </View>
                {expanded && (
                  <View style={styles.detail}>
                    {b.replyTo && (
                      <View style={styles.contextBox}>
                        <Muted>Jouw eerdere bericht:</Muted>
                        <Text style={styles.contextText}>{b.replyTo.inhoud}</Text>
                      </View>
                    )}
                    <Text style={styles.inhoud}>{b.inhoud}</Text>
                    {b.replies.map((r) => (
                      <View key={r.id} style={styles.replyBox}>
                        <Muted>
                          {r.verzender.id === user?.id ? "Jij" : r.verzender.name} · {fmtDatumTijd(r.createdAt)}
                        </Muted>
                        <Text style={styles.replyText}>{r.inhoud}</Text>
                      </View>
                    ))}
                    <Input value={replyText} onChangeText={setReplyText} placeholder="Schrijf een reactie..." multiline />
                    {sendError && <Text style={styles.error}>{sendError}</Text>}
                    <Button title="Reageren" small onPress={() => sendReply(b)} loading={sending} disabled={!replyText.trim()} />
                  </View>
                )}
              </Card>
            );
          })
        ))}

      {tab === "verzonden" &&
        (verzonden.length === 0 ? (
          <Empty icon="paper-plane-outline" text="Nog niets verzonden." />
        ) : (
          verzonden.map((b) => {
            const expanded = openId === b.id;
            return (
              <Card key={b.id} onPress={() => setOpenId(expanded ? null : b.id)}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{b.onderwerp}</Text>
                    <Muted>
                      Aan: {b.doelLabel ?? b.ontvanger?.name ?? `${b.aantalOntvangers} ontvangers`} ·{" "}
                      {fmtDatumTijd(b.createdAt)}
                    </Muted>
                  </View>
                  {b.replies.length > 0 && (
                    <Badge text={`${b.replies.length} ↩`} bg={colors.primaryLight} fg={colors.primaryDark} />
                  )}
                </View>
                {expanded && (
                  <View style={styles.detail}>
                    <Text style={styles.inhoud}>{b.inhoud}</Text>
                    {b.replies.map((r) => (
                      <View key={r.id} style={styles.replyBox}>
                        <Muted>
                          {r.verzender.name} ({ROLE_LABELS[r.verzender.role] ?? r.verzender.role}) ·{" "}
                          {fmtDatumTijd(r.createdAt)}
                        </Muted>
                        <Text style={styles.replyText}>{r.inhoud}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            );
          })
        ))}

      {tab === "nieuw" && (
        <Card>
          <ChipSelect<DoelType>
            label="Versturen naar"
            options={[
              { value: "KLAS_LEERLINGEN", label: "Klas (leerlingen)" },
              { value: "KLAS_OUDERS", label: "Klas (ouders)" },
              { value: "GEBRUIKERS", label: "Individueel" },
            ]}
            value={doelType}
            onChange={(v) => {
              setDoelType(v);
              setPersoonId(null);
            }}
          />
          <ChipSelect
            label="Klas"
            options={klassen.map((k) => ({ value: k.id, label: k.naam }))}
            value={klasId}
            onChange={(v) => {
              setKlasId(v);
              setPersoonId(null);
            }}
          />
          {doelType === "GEBRUIKERS" && personen.length > 0 && (
            <ChipSelect
              label="Ontvanger"
              options={personen}
              value={persoonId}
              onChange={setPersoonId}
            />
          )}
          <Input label="Onderwerp" value={onderwerp} onChangeText={setOnderwerp} placeholder="Onderwerp" />
          <Input label="Bericht" value={inhoud} onChangeText={setInhoud} multiline placeholder="Typ je bericht..." />
          {sendError && <Text style={styles.error}>{sendError}</Text>}
          {sent && <Text style={styles.success}>{sent}</Text>}
          <Button
            title="Versturen"
            onPress={sendNieuw}
            loading={sending}
            disabled={!onderwerp.trim() || !inhoud.trim()}
          />
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
  row: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  title: { fontSize: 15, fontWeight: "500", color: colors.text },
  unread: { fontWeight: "700" },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  inhoud: { fontSize: 14, color: colors.text, marginBottom: 8 },
  contextBox: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.textFaint,
  },
  contextText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  replyBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    paddingLeft: 10,
    marginLeft: 6,
    marginBottom: 8,
  },
  replyText: { fontSize: 14, color: colors.text, marginTop: 2 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 4 },
  success: { color: colors.primaryDark, fontSize: 13, marginBottom: 4 },
});

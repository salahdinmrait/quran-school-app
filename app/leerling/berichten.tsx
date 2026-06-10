import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input } from "../../components/ui";
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
  verzender: { id: string; name: string; role: string };
  replies: ThreadMessage[];
  replyTo: ThreadMessage | null;
}

export default function LeerlingBerichten() {
  const { user } = useAuth();
  const { data, setData, error, loading, refreshing, refresh, reload } =
    useFetch<{ inbox: Bericht[]; verzonden: unknown[] }>("/api/berichten");
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const inbox = data?.inbox ?? [];

  async function openBericht(b: Bericht) {
    const wasOpen = openId === b.id;
    setOpenId(wasOpen ? null : b.id);
    setReplyText("");
    setSendError(null);
    if (!wasOpen && !b.gelezen) {
      api(`/api/berichten/${b.id}`, { method: "PUT" }).catch(() => {});
      setData((prev) =>
        prev
          ? {
              ...prev,
              inbox: prev.inbox.map((m) => (m.id === b.id ? { ...m, gelezen: true } : m)),
            }
          : prev
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
      // Optimistic: add to thread locally
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

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {inbox.length === 0 ? (
        <Empty icon="mail-outline" text="Geen berichten." />
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
                {b.replies.length > 0 && (
                  <Badge text={`${b.replies.length} ↩`} bg={colors.primaryLight} fg={colors.primaryDark} />
                )}
              </View>

              {expanded && (
                <View style={styles.detail}>
                  {b.replyTo && (
                    <View style={styles.contextBox}>
                      <Muted>Eerder bericht van {b.replyTo.verzender.name}:</Muted>
                      <Text style={styles.contextText}>{b.replyTo.inhoud}</Text>
                    </View>
                  )}

                  <Text style={styles.inhoud}>{b.inhoud}</Text>

                  {b.replies.map((r) => (
                    <View key={r.id} style={styles.replyBox}>
                      <Muted>
                        {r.verzender.id === user?.id ? "Jij" : r.verzender.name} ·{" "}
                        {fmtDatumTijd(r.createdAt)}
                      </Muted>
                      <Text style={styles.replyText}>{r.inhoud}</Text>
                    </View>
                  ))}

                  <View style={styles.replyForm}>
                    <Input
                      value={replyText}
                      onChangeText={setReplyText}
                      placeholder="Schrijf een reactie..."
                      multiline
                    />
                    {sendError && <Text style={styles.error}>{sendError}</Text>}
                    <Button
                      title="Reageren"
                      onPress={() => sendReply(b)}
                      loading={sending}
                      disabled={!replyText.trim()}
                      small
                    />
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
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
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
    borderLeftColor: colors.primary,
    paddingLeft: 10,
    marginLeft: 6,
    marginBottom: 8,
  },
  replyText: { fontSize: 14, color: colors.text, marginTop: 2 },
  replyForm: { marginTop: 8 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 4 },
});

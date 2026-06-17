import { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../lib/useFetch";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect, CheckRow } from "./ui";
import { LinkText } from "./LinkText";
import { pickBijlage, openAttachment, GekozenBijlage } from "../lib/bijlage";
import { colors, ROLE_LABELS } from "../lib/theme";
import { fmtDatumTijd } from "../lib/format";

// Gedeeld berichten-scherm voor DOCENT en ADMIN — zelfde opties als de site:
// specifieke leerling(en)/ouder(s)/docent(en) met multi-select, of hele klas
// (leerlingen dan wel ouders). Inbox en verzonden tonen volledige threads.

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
  hasBijlage?: boolean;
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
  hasBijlage?: boolean;
  ontvanger: { id: string; name: string; role: string } | null;
  replies: ThreadMessage[];
}

interface TargetKlas {
  id: string;
  naam: string;
  leerlingen: { id: string; name: string }[];
  ouders: { id: string; name: string; kindNaam: string }[];
}

// /api/docent/klassen geeft een array; /api/admin/berichten-data geeft
// { klassen, docenten }.
type TargetsResponse = TargetKlas[] | { klassen: TargetKlas[]; docenten: { id: string; name: string }[] };

type Tab = "inbox" | "verzonden" | "nieuw";
type DoelType = "LEERLINGEN" | "OUDERS" | "DOCENTEN" | "BEHEER" | "KLAS_LEERLINGEN" | "KLAS_OUDERS";

export function BerichtenView({ targetsEndpoint }: { targetsEndpoint: string }) {
  const { user } = useAuth();
  const { data, setData, error, loading, refreshing, refresh, reload } =
    useFetch<{ inbox: BerichtIn[]; verzonden: BerichtUit[] }>("/api/berichten");
  const targets = useFetch<TargetsResponse>(targetsEndpoint);

  const [tab, setTab] = useState<Tab>("inbox");
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Compose state
  const [doelType, setDoelType] = useState<DoelType>("LEERLINGEN");
  const [klasId, setKlasId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zoek, setZoek] = useState("");
  const [onderwerp, setOnderwerp] = useState("");
  const [inhoud, setInhoud] = useState("");
  const [bijlage, setBijlage] = useState<GekozenBijlage | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const klassen: TargetKlas[] = useMemo(
    () => (Array.isArray(targets.data) ? targets.data : targets.data?.klassen ?? []),
    [targets.data]
  );
  const docenten = useMemo(
    () => (Array.isArray(targets.data) ? [] : targets.data?.docenten ?? []),
    [targets.data]
  );
  const isAdmin = user?.role === "ADMIN";

  // Alle unieke personen over alle klassen heen (zoals op de site)
  const allePersonen = useMemo(() => {
    if (doelType === "DOCENTEN") {
      return docenten.map((d) => ({ id: d.id, name: d.name, sub: "" }));
    }
    const map = new Map<string, { id: string; name: string; sub: string }>();
    for (const k of klassen) {
      if (doelType === "LEERLINGEN") {
        for (const l of k.leerlingen) if (!map.has(l.id)) map.set(l.id, { id: l.id, name: l.name, sub: k.naam });
      } else if (doelType === "OUDERS") {
        for (const o of k.ouders) if (!map.has(o.id)) map.set(o.id, { id: o.id, name: o.name, sub: `ouder van ${o.kindNaam}` });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [doelType, klassen, docenten]);

  const gefilterd = zoek.trim()
    ? allePersonen.filter((p) => p.name.toLowerCase().includes(zoek.trim().toLowerCase()))
    : allePersonen;

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const inbox = data?.inbox ?? [];
  const verzonden = data?.verzonden ?? [];
  const isKlasBroadcast = doelType === "KLAS_LEERLINGEN" || doelType === "KLAS_OUDERS";
  const isBeheer = doelType === "BEHEER";

  async function kiesBijlage() {
    setSendError(null);
    const { bijlage: b, error: e } = await pickBijlage();
    if (e) setSendError(e);
    else if (b) setBijlage(b);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
        ...(bijlage ? { bijlageNaam: bijlage.naam, bijlageData: bijlage.data, bijlageType: bijlage.type } : {}),
      };
      if (isBeheer) {
        body.doelType = "ADMINS";
      } else if (isKlasBroadcast) {
        if (!klasId) {
          setSendError("Kies een klas");
          setSending(false);
          return;
        }
        body.doelType = doelType;
        body.doelId = klasId;
      } else {
        if (selectedIds.size === 0) {
          setSendError("Kies minimaal één ontvanger");
          setSending(false);
          return;
        }
        body.doelType = "GEBRUIKERS";
        body.doelIds = Array.from(selectedIds);
      }
      const res = await api<{ count: number }>("/api/berichten", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSent(`Verstuurd naar ${res.count} ontvanger${res.count === 1 ? "" : "s"} ✓`);
      setOnderwerp("");
      setInhoud("");
      setBijlage(null);
      setSelectedIds(new Set());
      refresh();
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : "Versturen mislukt");
    } finally {
      setSending(false);
    }
  }

  const doelOptions: { value: DoelType; label: string }[] = [
    { value: "LEERLINGEN", label: "Leerling(en)" },
    { value: "OUDERS", label: "Ouder(s)" },
    ...(isAdmin
      ? [{ value: "DOCENTEN" as DoelType, label: "Docent(en)" }]
      : [{ value: "BEHEER" as DoelType, label: "Beheer" }]),
    { value: "KLAS_LEERLINGEN", label: "Hele klas" },
    { value: "KLAS_OUDERS", label: "Ouders v.d. klas" },
  ];

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
                    <LinkText style={styles.inhoud}>{b.inhoud}</LinkText>
                    {b.hasBijlage ? (
                      <Text style={styles.bijlageLink} onPress={() => openAttachment("bericht", b.id)}>📎 Bijlage openen</Text>
                    ) : null}
                    {b.replies.map((r) => (
                      <View key={r.id} style={styles.replyBox}>
                        <Muted>
                          {r.verzender.id === user?.id ? "Jij" : r.verzender.name} · {fmtDatumTijd(r.createdAt)}
                        </Muted>
                        <LinkText style={styles.replyText}>{r.inhoud}</LinkText>
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
                    <LinkText style={styles.inhoud}>{b.inhoud}</LinkText>
                    {b.hasBijlage ? (
                      <Text style={styles.bijlageLink} onPress={() => openAttachment("bericht", b.id)}>📎 Bijlage openen</Text>
                    ) : null}
                    {b.replies.map((r) => (
                      <View key={r.id} style={styles.replyBox}>
                        <Muted>
                          {r.verzender.name} ({ROLE_LABELS[r.verzender.role] ?? r.verzender.role}) ·{" "}
                          {fmtDatumTijd(r.createdAt)}
                        </Muted>
                        <LinkText style={styles.replyText}>{r.inhoud}</LinkText>
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
            options={doelOptions}
            value={doelType}
            onChange={(v) => {
              setDoelType(v);
              setSelectedIds(new Set());
              setKlasId(null);
              setZoek("");
            }}
          />

          {isBeheer ? (
            <Muted style={{ marginBottom: 8 }}>Dit bericht gaat naar het beheer van de school.</Muted>
          ) : isKlasBroadcast ? (
            <ChipSelect
              label="Klas"
              options={klassen.map((k) => ({
                value: k.id,
                label:
                  doelType === "KLAS_OUDERS"
                    ? `${k.naam} (${k.ouders.length} ouders)`
                    : `${k.naam} (${k.leerlingen.length} lln)`,
              }))}
              value={klasId}
              onChange={setKlasId}
            />
          ) : (
            <View style={styles.selectBox}>
              <View style={styles.selectHeader}>
                <Text style={styles.selectLabel}>
                  Ontvangers ({selectedIds.size} geselecteerd)
                </Text>
                <View style={styles.selectActions}>
                  <Text
                    style={styles.selectAction}
                    onPress={() => setSelectedIds(new Set(gefilterd.map((p) => p.id)))}
                  >
                    Alles
                  </Text>
                  <Text style={styles.selectAction} onPress={() => setSelectedIds(new Set())}>
                    Niets
                  </Text>
                </View>
              </View>
              {allePersonen.length > 6 && (
                <Input value={zoek} onChangeText={setZoek} placeholder="Zoeken op naam..." />
              )}
              {gefilterd.length === 0 ? (
                <Muted>
                  {doelType === "OUDERS"
                    ? "Geen ouders gevonden (koppel ouders aan leerlingen)."
                    : doelType === "DOCENTEN"
                    ? "Geen docenten gevonden."
                    : "Geen leerlingen gevonden."}
                </Muted>
              ) : (
                gefilterd.map((p) => (
                  <CheckRow
                    key={p.id}
                    label={p.name}
                    sublabel={p.sub || undefined}
                    checked={selectedIds.has(p.id)}
                    onToggle={() => toggleSelect(p.id)}
                  />
                ))
              )}
            </View>
          )}

          <Input label="Onderwerp" value={onderwerp} onChangeText={setOnderwerp} placeholder="Onderwerp" />
          <Input label="Bericht" value={inhoud} onChangeText={setInhoud} multiline placeholder="Typ je bericht..." />
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
          <Button
            title="Versturen"
            onPress={sendNieuw}
            loading={sending}
            disabled={
              !onderwerp.trim() || !inhoud.trim() ||
              (isBeheer ? false : isKlasBroadcast ? !klasId : selectedIds.size === 0)
            }
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
  bijlageLink: { color: colors.info, fontSize: 14, textDecorationLine: "underline", marginBottom: 8 },
  bijlageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
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
  selectBox: { marginBottom: 12 },
  selectHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  selectLabel: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
  selectActions: { flexDirection: "row", gap: 12 },
  selectAction: { fontSize: 13, color: colors.primaryDark, fontWeight: "600" },
});

import { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFetch } from "../lib/useFetch";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/LanguageContext";
import { row, textStart } from "../lib/rtl";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect } from "./ui";
import { PersonPicker, Persoon } from "./PersonPicker";
import { LinkText } from "./LinkText";
import { pickBijlage, openAttachment, GekozenBijlage } from "../lib/bijlage";
import { colors } from "../lib/theme";
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
  leerlingen: { id: string; name: string; email: string }[];
  ouders: { id: string; name: string; email: string; kindNaam: string }[];
}

// /api/docent/klassen geeft een array; /api/admin/berichten-data geeft
// { klassen, docenten }.
type TargetsResponse = TargetKlas[] | { klassen: TargetKlas[]; docenten: { id: string; name: string; email: string }[] };

type Tab = "inbox" | "verzonden" | "nieuw";
type DoelType = "LEERLINGEN" | "OUDERS" | "DOCENTEN" | "BEHEER" | "KLAS_LEERLINGEN" | "KLAS_OUDERS";

export function BerichtenView({ targetsEndpoint }: { targetsEndpoint: string }) {
  const { user } = useAuth();
  const { t, tel, isRTL, label } = useT();
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  // Alle unieke personen over alle klassen heen (zoals op de site). Het
  // e-mailadres gaat mee zodat de zoekbalk er ook op kan zoeken.
  const allePersonen = useMemo<Persoon[]>(() => {
    if (doelType === "DOCENTEN") {
      return docenten.map((d) => ({ id: d.id, name: d.name, email: d.email, extra: d.email }));
    }
    const map = new Map<string, Persoon>();
    for (const k of klassen) {
      if (doelType === "LEERLINGEN") {
        for (const l of k.leerlingen)
          if (!map.has(l.id)) map.set(l.id, { id: l.id, name: l.name, email: l.email, extra: `${k.naam} · ${l.email}` });
      } else if (doelType === "OUDERS") {
        for (const o of k.ouders)
          if (!map.has(o.id))
            map.set(o.id, {
              id: o.id,
              name: o.name,
              email: o.email,
              extra: `${t("c_ouder")} · ${o.kindNaam} · ${o.email}`,
            });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [doelType, klassen, docenten, t]);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const inbox = data?.inbox ?? [];
  const verzonden = data?.verzonden ?? [];
  const isKlasBroadcast = doelType === "KLAS_LEERLINGEN" || doelType === "KLAS_OUDERS";
  const isBeheer = doelType === "BEHEER";

  async function kiesBijlage() {
    setSendError(null);
    const { bijlage: b, fout } = await pickBijlage();
    if (fout) setSendError(t(fout));
    else if (b) setBijlage(b);
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
      setSendError(e instanceof ApiError ? e.message : t("c_versturen_mislukt"));
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
          setSendError(t("br_kies_klas"));
          setSending(false);
          return;
        }
        body.doelType = doelType;
        body.doelId = klasId;
      } else {
        if (selectedIds.length === 0) {
          setSendError(t("br_kies_ontvanger"));
          setSending(false);
          return;
        }
        body.doelType = "GEBRUIKERS";
        body.doelIds = selectedIds;
      }
      const res = await api<{ count: number }>("/api/berichten", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSent(tel("br_verstuurd", res.count));
      setOnderwerp("");
      setInhoud("");
      setBijlage(null);
      setSelectedIds([]);
      refresh();
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : t("c_versturen_mislukt"));
    } finally {
      setSending(false);
    }
  }

  const doelOptions: { value: DoelType; label: string }[] = [
    { value: "LEERLINGEN", label: t("br_doel_leerlingen") },
    { value: "OUDERS", label: t("br_doel_ouders") },
    ...(isAdmin
      ? [{ value: "DOCENTEN" as DoelType, label: t("br_doel_docenten") }]
      : [{ value: "BEHEER" as DoelType, label: t("br_doel_beheer") }]),
    { value: "KLAS_LEERLINGEN", label: t("br_doel_klas_leerlingen") },
    { value: "KLAS_OUDERS", label: t("br_doel_klas_ouders") },
  ];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={[styles.tabs, { flexDirection: row(isRTL) }]}>
        {(["inbox", "verzonden", "nieuw"] as Tab[]).map((naam) => (
          <Text
            key={naam}
            onPress={() => setTab(naam)}
            style={[styles.tab, tab === naam && styles.tabActive]}
          >
            {naam === "inbox"
              ? t("br_inbox", { count: inbox.filter((b) => !b.gelezen).length })
              : naam === "verzonden"
              ? t("br_verzonden")
              : t("br_nieuw")}
          </Text>
        ))}
      </View>

      {tab === "inbox" &&
        (inbox.length === 0 ? (
          <Empty icon="mail-outline" text={t("c_geen_berichten_ontvangen")} />
        ) : (
          inbox.map((b) => {
            const expanded = openId === b.id;
            return (
              <Card key={b.id}>
                {/* Alleen de kop-rij toggle't; zo klapt de kaart op web niet dicht
                    als je in het reactieveld klikt (kliks bubbelen daar omhoog). */}
                <Pressable onPress={() => openBericht(b)} style={[styles.row, { flexDirection: row(isRTL) }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, !b.gelezen && styles.unread, { textAlign: textStart(isRTL) }]}>
                      {b.onderwerp}
                    </Text>
                    <Muted>
                      {b.verzender.name} ({label("rol", b.verzender.role)}) ·{" "}
                      {fmtDatumTijd(b.createdAt)}
                    </Muted>
                  </View>
                  {!b.gelezen && <Badge text={t("br_badge_nieuw")} bg={colors.infoLight} fg={colors.info} />}
                  {b.replyTo && <Badge text={t("br_badge_antwoord")} bg={colors.infoLight} fg={colors.info} />}
                </Pressable>
                {expanded && (
                  <View style={styles.detail}>
                    {b.replyTo && (
                      <View style={styles.contextBox}>
                        <Muted>{t("br_jouw_eerdere")}</Muted>
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
                    <Input value={replyText} onChangeText={setReplyText} placeholder={t("c_reactie_ph")} multiline />
                    {sendError && <Text style={[styles.error, { textAlign: textStart(isRTL) }]}>{sendError}</Text>}
                    <Button title={t("c_reageren")} small onPress={() => sendReply(b)} loading={sending} disabled={!replyText.trim()} />
                  </View>
                )}
              </Card>
            );
          })
        ))}

      {tab === "verzonden" &&
        (verzonden.length === 0 ? (
          <Empty icon="paper-plane-outline" text={t("c_niets_verzonden")} />
        ) : (
          verzonden.map((b) => {
            const expanded = openId === b.id;
            return (
              <Card key={b.id}>
                <Pressable
                  onPress={() => setOpenId(expanded ? null : b.id)}
                  style={[styles.row, { flexDirection: row(isRTL) }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { textAlign: textStart(isRTL) }]}>{b.onderwerp}</Text>
                    <Muted>
                      {t("br_aan", {
                        wie:
                          b.doelLabel ??
                          b.ontvanger?.name ??
                          t("br_n_ontvangers", { count: b.aantalOntvangers }),
                      })}{" "}
                      · {fmtDatumTijd(b.createdAt)}
                    </Muted>
                  </View>
                  {b.replies.length > 0 && (
                    <Badge text={`${b.replies.length} ↩`} bg={colors.primaryLight} fg={colors.primaryDark} />
                  )}
                </Pressable>
                {expanded && (
                  <View style={styles.detail}>
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
                          {r.verzender.name} ({label("rol", r.verzender.role)}) ·{" "}
                          {fmtDatumTijd(r.createdAt)}
                        </Muted>
                        <LinkText style={[styles.replyText, { textAlign: textStart(isRTL) }]}>{r.inhoud}</LinkText>
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
            label={t("br_versturen_naar")}
            options={doelOptions}
            value={doelType}
            onChange={(v) => {
              setDoelType(v);
              setSelectedIds([]);
              setKlasId(null);
            }}
          />

          {isBeheer ? (
            <Muted style={{ marginBottom: 8 }}>{t("br_naar_beheer")}</Muted>
          ) : isKlasBroadcast ? (
            <ChipSelect
              label={t("c_klas")}
              options={klassen.map((k) => ({
                value: k.id,
                label:
                  doelType === "KLAS_OUDERS"
                    ? t("br_klas_ouders_optie", { klas: k.naam, count: k.ouders.length })
                    : t("br_klas_lln_optie", { klas: k.naam, count: k.leerlingen.length }),
              }))}
              value={klasId}
              onChange={setKlasId}
            />
          ) : (
            <View style={styles.selectBox}>
              <View style={[styles.selectHeader, { flexDirection: row(isRTL) }]}>
                <Text style={[styles.selectLabel, { textAlign: textStart(isRTL) }]}>
                  {t("br_ontvangers_n", { count: selectedIds.length })}
                </Text>
                {selectedIds.length > 0 && (
                  <Text style={styles.selectAction} onPress={() => setSelectedIds([])}>
                    {t("br_selectie_wissen")}
                  </Text>
                )}
              </View>
              {/* Losse personen kiezen gaat via de zoekbalk; hele klassen
                  blijven via "Versturen naar" hierboven. */}
              <PersonPicker
                personen={allePersonen}
                geselecteerd={selectedIds}
                onChange={setSelectedIds}
                leegTekst={
                  doelType === "OUDERS"
                    ? t("br_geen_ouders")
                    : doelType === "DOCENTEN"
                    ? t("br_geen_docenten")
                    : t("br_geen_leerlingen")
                }
              />
            </View>
          )}

          <Input label={t("c_onderwerp")} value={onderwerp} onChangeText={setOnderwerp} placeholder={t("c_onderwerp")} />
          <Input label={t("c_bericht")} value={inhoud} onChangeText={setInhoud} multiline placeholder={t("br_bericht_ph")} />
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
          <Button
            title={t("c_versturen")}
            onPress={sendNieuw}
            loading={sending}
            disabled={
              !onderwerp.trim() || !inhoud.trim() ||
              (isBeheer ? false : isKlasBroadcast ? !klasId : selectedIds.length === 0)
            }
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { gap: 8, marginBottom: 12 },
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
  row: { alignItems: "center", gap: 6, flexWrap: "wrap" },
  title: { fontSize: 15, fontWeight: "500", color: colors.text },
  unread: { fontWeight: "700" },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  inhoud: { fontSize: 14, color: colors.text, marginBottom: 8 },
  bijlageLink: { color: colors.info, fontSize: 14, textDecorationLine: "underline", marginBottom: 8 },
  bijlageRow: { alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
  contextBox: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    // Logische randen: in het Arabisch loopt de accentbalk rechts mee.
    borderStartWidth: 3,
    borderStartColor: colors.textFaint,
  },
  contextText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  replyBox: {
    borderStartWidth: 3,
    borderStartColor: colors.info,
    paddingStart: 10,
    marginStart: 6,
    marginBottom: 8,
  },
  replyText: { fontSize: 14, color: colors.text, marginTop: 2 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 4 },
  success: { color: colors.primaryDark, fontSize: 13, marginBottom: 4 },
  selectBox: { marginBottom: 12 },
  selectHeader: { alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  selectLabel: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
  selectAction: { fontSize: 13, color: colors.primaryDark, fontWeight: "600" },
});

import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input } from "../../components/ui";
import { PersonPicker, Persoon } from "../../components/PersonPicker";
import { useT } from "../../lib/LanguageContext";
import { row, textStart } from "../../lib/rtl";
import { colors } from "../../lib/theme";
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

interface Contacten {
  docenten: { id: string; name: string; email: string }[];
  admins: { id: string; name: string; email: string }[];
}

type Tab = "inbox" | "verzonden" | "nieuw";

export default function OuderBerichten() {
  const { t, isRTL, label } = useT();
  const { data, setData, error, loading, refreshing, refresh, reload } =
    useFetch<{ inbox: Bericht[]; verzonden: Bericht[]; admins: { id: string; name: string }[] }>("/api/ouder/berichten");
  // Dezelfde contactenregels als bij de leerling, uit één bron op de server —
  // niet opnieuw afgeleid uit het (veel zwaardere) kind-overzicht.
  const contacten = useFetch<Contacten>("/api/ouder/contacten");

  const [tab, setTab] = useState<Tab>("inbox");
  const [openId, setOpenId] = useState<string | null>(null);
  const [docentIds, setDocentIds] = useState<string[]>([]);
  const [onderwerp, setOnderwerp] = useState("");
  const [inhoud, setInhoud] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const inbox = data?.inbox ?? [];
  const verzonden = data?.verzonden ?? [];

  // Docenten van de kinderen en het beheer in één zoeklijst.
  const ontvangers: Persoon[] = [
    ...(contacten.data?.docenten ?? []).map((d) => ({ id: d.id, name: d.name, email: d.email, extra: `${label("rol", "DOCENT")} · ${d.email}` })),
    ...(contacten.data?.admins ?? []).map((a) => ({ id: a.id, name: a.name, email: a.email, extra: `${t("c_beheer")} · ${a.email}` })),
  ];

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
    if (docentIds.length === 0 || !onderwerp.trim() || !inhoud.trim()) return;
    setSending(true);
    setSendError(null);
    setSent(false);
    try {
      await api("/api/ouder/berichten", {
        method: "POST",
        body: JSON.stringify({
          ontvangerIds: docentIds,
          onderwerp: onderwerp.trim(),
          inhoud: inhoud.trim(),
        }),
      });
      setSent(true);
      setOnderwerp("");
      setInhoud("");
      setDocentIds([]);
      refresh();
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : t("c_versturen_mislukt"));
    } finally {
      setSending(false);
    }
  }

  function renderBericht(b: Bericht, richting: "in" | "uit") {
    const expanded = openId === b.id;
    const persoon = richting === "in" ? b.verzender : b.ontvanger;
    return (
      <Card key={b.id} onPress={() => openBericht(b)}>
        <View style={[styles.row, { flexDirection: row(isRTL) }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { textAlign: textStart(isRTL) }, richting === "in" && !b.gelezen && styles.unread]}>
              {b.onderwerp}
            </Text>
            <Muted>
              {t(richting === "in" ? "ou_van" : "ou_aan", {
                naam: persoon?.name ?? "—",
                rol: persoon ? label("rol", persoon.role) : "",
              })}{" · "}
              {fmtDatumTijd(b.createdAt)}
            </Muted>
          </View>
          {richting === "in" && !b.gelezen && (
            <Badge text={t("br_badge_nieuw")} bg={colors.infoLight} fg={colors.info} />
          )}
        </View>
        {expanded && <Text style={[styles.inhoud, { textAlign: textStart(isRTL) }]}>{b.inhoud}</Text>}
      </Card>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={[styles.tabs, { flexDirection: row(isRTL) }]}>
        {(["inbox", "verzonden", "nieuw"] as Tab[]).map((naam) => (
          <Text
            key={naam}
            onPress={() => setTab(naam)}
            style={[styles.tab, tab === naam && styles.tabActive]}
            numberOfLines={1}
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
          inbox.map((b) => renderBericht(b, "in"))
        ))}

      {tab === "verzonden" &&
        (verzonden.length === 0 ? (
          <Empty icon="paper-plane-outline" text={t("c_niets_verzonden")} />
        ) : (
          verzonden.map((b) => renderBericht(b, "uit"))
        ))}

      {tab === "nieuw" && (
        <Card>
          <Muted style={{ marginBottom: 8 }}>{t("ou_uitleg")}</Muted>
          <PersonPicker
            label={t("lb_aan")}
            personen={ontvangers}
            geselecteerd={docentIds}
            onChange={setDocentIds}
            leegTekst={t("ou_geen_contacten")}
          />
          <Input label={t("c_onderwerp")} value={onderwerp} onChangeText={setOnderwerp} />
          <Input label={t("c_bericht")} value={inhoud} onChangeText={setInhoud} multiline />
          {sendError && <Text style={[styles.error, { textAlign: textStart(isRTL) }]}>{sendError}</Text>}
          {sent && <Text style={[styles.success, { textAlign: textStart(isRTL) }]}>{t("lb_verstuurd")}</Text>}
          <Button
            title={t("c_versturen")}
            onPress={sendNieuw}
            loading={sending}
            disabled={docentIds.length === 0 || !onderwerp.trim() || !inhoud.trim()}
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
  row: { alignItems: "center", gap: 6 },
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

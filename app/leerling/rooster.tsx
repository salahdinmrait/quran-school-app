import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/LanguageContext";
import { row, textStart } from "../../lib/rtl";
import { Loading, ErrorView, Muted } from "../../components/ui";
import { Agenda, AgendaEvent, huiswerkBadge } from "../../components/Agenda";
import { LesDetail, type Les as LesDetailLes, type LesHuiswerk } from "../../components/LesDetail";
import { LinkText } from "../../components/LinkText";
import { openAttachment } from "../../lib/bijlage";
import { colors } from "../../lib/theme";

interface Les {
  id: string;
  datum: string;
  begintijd: string;
  eindtijd: string;
  lokaal: string | null;
  beschrijving: string | null;
  bijlageNaam: string | null;
  hasBijlage: boolean;
  klas: { id: string; naam: string };
  vak: { id: string; naam: string } | null;
  docenten: { id: string; name: string }[];
  huiswerk: {
    id: string;
    titel: string;
    beschrijving: string | null;
    hasBijlage: boolean;
    vak: { id: string; naam: string };
    inleveringen: { id: string }[];
  }[];
}

export default function LeerlingRooster() {
  const { user } = useAuth();
  const { t, isRTL } = useT();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Les[]>("/api/leerling/lessen");
  const [gekozenLesId, setGekozenLesId] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const lessen = data ?? [];
  const gekozenLes = lessen.find((l) => l.id === gekozenLesId) ?? null;

  const events: AgendaEvent[] = lessen.map((l) => ({
    id: l.id,
    datum: l.datum,
    begintijd: l.begintijd,
    eindtijd: l.eindtijd,
    titel: l.klas.naam + (l.vak ? ` · ${l.vak.naam}` : ""),
    subtitel: [l.docenten.map((d) => d.name).join(", "), l.lokaal].filter(Boolean).join(" · ") || undefined,
    // Hetzelfde HW-label als de docent ziet.
    badges: huiswerkBadge(l.huiswerk.length, t("c_hw_label")),
    onPress: () => setGekozenLesId(l.id),
    extra: (
      <View>
        {l.beschrijving ? (
          <LinkText style={[styles.beschrijving, { textAlign: textStart(isRTL) }]}>{l.beschrijving}</LinkText>
        ) : null}
        {l.hasBijlage ? (
          <Text style={[styles.bijlage, { textAlign: textStart(isRTL) }]} onPress={() => openAttachment("les", l.id)}>
            📎 {t("lr_lesbijlage_openen")}
          </Text>
        ) : null}
        {l.huiswerk.map((hw) => (
          <View key={hw.id} style={[styles.hwRow, { flexDirection: row(isRTL) }]}>
            <Text style={styles.hwDot}>•</Text>
            <Text style={[styles.hwText, { textAlign: textStart(isRTL) }]}>
              {hw.titel}
              {hw.inleveringen.length > 0 ? "  ✓" : ""}
            </Text>
          </View>
        ))}
      </View>
    ),
  }));

  // Hetzelfde lesdetail als de docent gebruikt, maar alleen-lezen. Het huiswerk
  // gaat mee uit deze lijst; de docent-API is voor een leerling afgesloten.
  if (gekozenLes) {
    const les: LesDetailLes = {
      ...gekozenLes,
      huiswerkAantal: gekozenLes.huiswerk.length,
    };
    const huiswerk: LesHuiswerk[] = gekozenLes.huiswerk;
    return (
      <View style={styles.container}>
        <LesDetail
          les={les}
          rol="LEERLING"
          huiswerkVooraf={huiswerk}
          onSluiten={() => setGekozenLesId(null)}
          onGewijzigd={reload}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { textAlign: textStart(isRTL) }]}>{t("c_groet")}</Text>
        <Text style={[styles.name, { textAlign: textStart(isRTL) }]}>{user?.name}</Text>
        {user?.schoolNaam ? <Muted>{user.schoolNaam}</Muted> : null}
        <Muted>{t("lr_tik_les")}</Muted>
      </View>
      <View style={styles.agendaWrap}>
        <Agenda events={events} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  greeting: { fontSize: 14, color: colors.textMuted },
  name: { fontSize: 22, fontWeight: "700", color: colors.text },
  agendaWrap: { flex: 1, paddingHorizontal: 16 },
  beschrijving: { fontSize: 13, color: colors.text, marginTop: 6 },
  bijlage: { color: colors.info, fontSize: 13, textDecorationLine: "underline", marginTop: 6 },
  hwRow: { gap: 6, marginTop: 4 },
  hwDot: { color: colors.warning, fontSize: 13 },
  hwText: { flex: 1, fontSize: 13, color: colors.textMuted },
});

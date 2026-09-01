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
import { colors, STATUS_COLORS } from "../../lib/theme";

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
  aanwezigheid: { status: string }[];
  huiswerk: {
    id: string;
    titel: string;
    beschrijving: string | null;
    hasBijlage: boolean;
    vak: { id: string; naam: string };
    inleveringen: { id: string; afgevinktOp: string | null }[];
  }[];
}

interface KindLessen {
  kind: { id: string; name: string };
  lessen: Les[];
}

export default function OuderRooster() {
  const { user } = useAuth();
  const { t, isRTL, label } = useT();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<KindLessen[]>("/api/ouder/lessen");
  // De agenda voegt de kinderen samen, dus een les is pas uniek mét het kind erbij.
  const [gekozen, setGekozen] = useState<{ kindId: string; lesId: string } | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const result = data ?? [];
  const meerdereKinderen = result.length > 1;

  const gekozenKind = gekozen ? result.find((r) => r.kind.id === gekozen.kindId) ?? null : null;
  const gekozenLes = gekozenKind?.lessen.find((l) => l.id === gekozen?.lesId) ?? null;

  // Alle lessen van alle kinderen samenvoegen tot één agenda
  const events: AgendaEvent[] = result.flatMap(({ kind, lessen }) =>
    lessen.map((l) => {
      const status = l.aanwezigheid?.[0]?.status;
      const c = status ? STATUS_COLORS[status] : null;
      return {
        id: `${kind.id}_${l.id}`,
        datum: l.datum,
        begintijd: l.begintijd,
        eindtijd: l.eindtijd,
        titel: l.klas.naam + (l.vak ? ` · ${l.vak.naam}` : ""),
        subtitel: [
          meerdereKinderen ? kind.name : null,
          (l.docenten ?? []).map((d) => d.name).join(", "),
          l.lokaal,
        ].filter(Boolean).join(" · ") || undefined,
        badges: [
          ...(status && c ? [{ text: label("status", status), bg: c.bg, fg: c.fg }] : []),
          ...(huiswerkBadge(l.huiswerk.length, t("c_hw_label")) ?? []),
        ],
        onPress: () => setGekozen({ kindId: kind.id, lesId: l.id }),
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
                  {hw.inleveringen.some((i) => i.afgevinktOp) ? "  ✓" : ""}
                </Text>
              </View>
            ))}
          </View>
        ),
      };
    })
  );

  // Hetzelfde alleen-lezen lesdetail als de leerling ziet, maar dan voor één
  // kind: naam en aanwezigheidsstatus gaan mee, het huiswerk komt uit deze
  // lijst omdat de docent-API voor een ouder afgesloten is.
  if (gekozenLes && gekozenKind) {
    const les: LesDetailLes = {
      ...gekozenLes,
      huiswerkAantal: gekozenLes.huiswerk.length,
    };
    const huiswerk: LesHuiswerk[] = gekozenLes.huiswerk;
    return (
      <View style={styles.container}>
        <LesDetail
          les={les}
          rol="OUDER"
          kindNaam={gekozenKind.kind.name}
          aanwezigheidStatus={gekozenLes.aanwezigheid?.[0]?.status ?? null}
          huiswerkVooraf={huiswerk}
          onSluiten={() => setGekozen(null)}
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

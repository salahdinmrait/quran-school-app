import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, shadows } from "../lib/theme";
import { useT } from "../lib/LanguageContext";
import { row, textEnd, textStart } from "../lib/rtl";

// De basiscomponenten kennen de taalrichting zelf. Daardoor hoeft geen enkel
// scherm apart te regelen dat een label, een chip of een sleutel-waarderij in
// het Arabisch aan de goede kant begint.

// ── Screen wrapper ────────────────────────────────────────────────────────────

export function Screen({
  children,
  refreshing,
  onRefresh,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

// ── Loading / error / empty states ───────────────────────────────────────────

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useT();
  return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <Button title={t("c_opnieuw_proberen")} onPress={onRetry} variant="secondary" />
      )}
    </View>
  );
}

export function Empty({ icon = "file-tray-outline", text }: { icon?: string; text: string }) {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={32} color={colors.textFaint} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Typography ───────────────────────────────────────────────────────────────

export function Title({ children }: { children: React.ReactNode }) {
  const { isRTL } = useT();
  return <Text style={[styles.title, { textAlign: textStart(isRTL) }]}>{children}</Text>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const { isRTL } = useT();
  return <Text style={[styles.sectionTitle, { textAlign: textStart(isRTL) }]}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  const { isRTL } = useT();
  return <Text style={[styles.muted, { textAlign: textStart(isRTL) }, style]}>{children}</Text>;
}

// ── Badge ─────────────────────────────────────────────────────────────────────

export function Badge({
  text,
  bg = colors.primaryLight,
  fg = colors.primaryDark,
}: {
  text: string;
  bg?: string;
  fg?: string;
}) {
  const { isRTL } = useT();
  // flexShrink zodat een langer Arabisch label de rij niet uit elkaar duwt.
  return (
    <View style={[styles.badge, { backgroundColor: bg, alignSelf: isRTL ? "flex-end" : "flex-start" }]}>
      <Text style={[styles.badgeText, { color: fg }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  small,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
}) {
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
      ? colors.danger
      : variant === "secondary"
      ? colors.card
      : "transparent";
  const fg = variant === "primary" || variant === "danger" ? "#fff" : colors.primaryDark;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg },
        variant === "primary" && shadows.button,
        variant === "secondary" && { borderWidth: 1, borderColor: colors.border },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
  keyboardType,
  autoCapitalize,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  const { isRTL } = useT();
  // Een wachtwoord- of e-mailveld blijft links uitgelijnd: dat zijn latijnse
  // tekens, ook in het Arabisch.
  const latijns = !!secureTextEntry || keyboardType === "email-address" || keyboardType === "numeric";
  return (
    <View style={styles.inputWrap}>
      {label ? <Text style={[styles.inputLabel, { textAlign: textStart(isRTL) }]}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? (secureTextEntry || keyboardType === "email-address" ? "none" : "sentences")}
        style={[styles.input, multiline && styles.inputMultiline, { textAlign: latijns ? "left" : textStart(isRTL) }]}
      />
    </View>
  );
}

// ── Select (simple chip-based picker) ─────────────────────────────────────────

export function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const { isRTL } = useT();
  return (
    <View style={styles.inputWrap}>
      {label ? <Text style={[styles.inputLabel, { textAlign: textStart(isRTL) }]}>{label}</Text> : null}
      <View style={[styles.chipRow, { flexDirection: row(isRTL) }]}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.chip, value === o.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, value === o.value && styles.chipTextActive]}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ── CheckRow (multi-select rij met checkbox) ─────────────────────────────────

export function CheckRow({
  label,
  sublabel,
  checked,
  onToggle,
}: {
  label: string;
  sublabel?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const { isRTL } = useT();
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.checkRow, { flexDirection: row(isRTL) }, pressed && { opacity: 0.85 }]}
    >
      <Ionicons
        name={checked ? "checkbox" : "square-outline"}
        size={22}
        color={checked ? colors.primary : colors.textFaint}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.checkLabel, { textAlign: textStart(isRTL) }]}>{label}</Text>
        {sublabel ? <Text style={[styles.checkSublabel, { textAlign: textStart(isRTL) }]}>{sublabel}</Text> : null}
      </View>
    </Pressable>
  );
}

// ── Menu tile (dashboard navigation) ──────────────────────────────────────────

export function MenuTile({
  icon,
  title,
  subtitle,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: number;
}) {
  const { isRTL } = useT();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.tileIcon, { alignSelf: isRTL ? "flex-end" : "flex-start" }]}>
        <Ionicons name={icon} size={22} color={colors.primaryDark} />
        {badge ? (
          <View style={[styles.tileBadge, isRTL ? { left: -6 } : { right: -6 }]}>
            <Text style={styles.tileBadgeText}>{badge > 99 ? "99+" : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tileTitle, { textAlign: textStart(isRTL) }]}>{title}</Text>
      {subtitle ? <Text style={[styles.tileSubtitle, { textAlign: textStart(isRTL) }]}>{subtitle}</Text> : null}
    </Pressable>
  );
}

// ── Key-value row ─────────────────────────────────────────────────────────────

export function KV({ k, v }: { k: string; v: string }) {
  const { isRTL } = useT();
  return (
    <View style={[styles.kvRow, { flexDirection: row(isRTL) }]}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={[styles.kvVal, { textAlign: textEnd(isRTL) }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: colors.bg },
  errorText: { color: colors.danger, textAlign: "center", fontSize: 15 },
  emptyBox: { alignItems: "center", padding: 32, gap: 8 },
  emptyText: { color: colors.textMuted, textAlign: "center", fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  title: { fontSize: 22, fontFamily: fonts.displayBold, color: colors.text, marginBottom: 4, letterSpacing: -0.3 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.displayMedium,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 8,
  },
  muted: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.body },
  badge: {
    borderRadius: radius.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 1,
  },
  badgeText: { fontSize: 11, fontFamily: fonts.displayMedium },
  button: {
    borderRadius: radius.button,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  buttonSmall: { paddingVertical: 7, paddingHorizontal: 12 },
  buttonText: { fontSize: 15, fontFamily: fonts.display, textAlign: "center" },
  inputWrap: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontFamily: fonts.bodyMedium, color: colors.textMuted, marginBottom: 4 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.body,
    ...shadows.input,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },
  chipRow: { flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text, fontFamily: fonts.body },
  chipTextActive: { color: "#fff", fontFamily: fonts.displayMedium },
  tile: {
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    width: "48%" as unknown as number,
    marginBottom: 12,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.surface,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tileBadge: {
    position: "absolute",
    top: -6,
    backgroundColor: colors.danger,
    borderRadius: radius.surface,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tileBadgeText: { color: "#fff", fontSize: 10, fontFamily: fonts.displayBold },
  checkRow: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  checkLabel: { fontSize: 14, color: colors.text, fontFamily: fonts.body },
  checkSublabel: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.body },
  tileTitle: { fontSize: 15, fontFamily: fonts.display, color: colors.text },
  tileSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: fonts.body },
  kvRow: {
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  kvKey: { color: colors.textMuted, fontSize: 14 },
  kvVal: { color: colors.text, fontSize: 14, fontWeight: "500", flexShrink: 1 },
});

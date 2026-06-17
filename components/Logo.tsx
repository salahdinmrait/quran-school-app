import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Rect, Line, G } from "react-native-svg";
import { colors, fonts } from "../lib/theme";

// Jadwal-monogram: een mihrab-tegel met een roostergrid; één vak gevuld = een
// ingeplande les. Terracotta (#9D5148) met blush (#F8E9E8) details.
export function JadwalMark({ size = 48 }: { size?: number }) {
  const h = (size * 72) / 64;
  return (
    <Svg width={size} height={h} viewBox="0 0 64 72">
      <Path d="M32 3C47 3 56 13 56 31V65c0 2.2-1.8 4-4 4H12c-2.2 0-4-1.8-4-4V31C8 13 17 3 32 3Z" fill={colors.primary} />
      <Path
        d="M32 9.5C44 9.5 50.5 17.5 50.5 31v30.5c0 1.1-.9 2-2 2H15.5c-1.1 0-2-.9-2-2V31C13.5 17.5 20 9.5 32 9.5Z"
        fill="none"
        stroke={colors.primaryLight}
        strokeOpacity={0.5}
        strokeWidth={1.1}
      />
      <Rect x={20} y={32} width={11} height={11} fill={colors.primaryLight} fillOpacity={0.92} />
      <G stroke={colors.primaryLight} strokeWidth={1.7} strokeLinecap="round" opacity={0.92}>
        <Line x1={20} y1={44} x2={44} y2={44} />
        <Line x1={32} y1={32} x2={32} y2={56} />
      </G>
    </Svg>
  );
}

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <JadwalMark size={size} />
      <View>
        <Text style={styles.word}>
          Jadwal<Text style={{ color: colors.primary }}>.</Text>
        </Text>
        <Text style={styles.ar}>جدول</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  word: { fontSize: 28, fontFamily: fonts.displayBold, color: colors.text, letterSpacing: -0.5 },
  ar: { fontSize: 16, color: colors.primary, fontFamily: fonts.body, marginTop: -2 },
});

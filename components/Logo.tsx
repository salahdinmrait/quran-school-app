import { View, Text, StyleSheet, Image } from "react-native";
import { colors, fonts } from "../lib/theme";

// Het Jadwal-zegel: de kalligrafische جدول-roundel, terracotta op bone.
// Vlak gevuld en transparant, dus hij schaalt van 24px tot volle breedte.
const ZEGEL = require("../assets/jadwal-seal.png");

export function JadwalMark({ size = 48 }: { size?: number }) {
  return (
    <Image
      source={ZEGEL}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Jadwal"
    />
  );
}

// Het zegel draagt de Arabische naam al, dus het woordmerk blijft kaal —
// geen tweede جدول ernaast.
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <JadwalMark size={size} />
      <Text style={styles.word}>
        Jadwal<Text style={{ color: colors.primary }}>.</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  word: { fontSize: 28, fontFamily: fonts.displayBold, color: colors.text, letterSpacing: -0.5 },
});

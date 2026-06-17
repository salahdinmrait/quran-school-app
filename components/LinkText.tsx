import React from "react";
import { Text, Linking, StyleProp, TextStyle } from "react-native";
import { colors } from "../lib/theme";

// Toont tekst waarin URL's klikbaar zijn (opent in de browser).
const URL_RE = /(https?:\/\/[^\s]+)/g;

export function LinkText({
  children,
  style,
}: {
  children: string | null | undefined;
  style?: StyleProp<TextStyle>;
}) {
  const text = children ?? "";
  const parts = text.split(URL_RE);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          // Strip trailing leestekens van de link
          const m = part.match(/[).,;!?]+$/);
          const trail = m ? m[0] : "";
          const url = trail ? part.slice(0, -trail.length) : part;
          return (
            <Text key={i}>
              <Text style={{ color: colors.info, textDecorationLine: "underline" }} onPress={() => Linking.openURL(url)}>
                {url}
              </Text>
              {trail}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

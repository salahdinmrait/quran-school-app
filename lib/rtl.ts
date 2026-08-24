import type { FlexStyle, TextStyle } from "react-native";

// Richtingshelpers voor Arabisch (RTL). Bewust géén I18nManager.forceRTL:
// dat vraagt op native een herstart van de app en doet op web niets zinnigs.
// De richting komt uit useT().isRTL en wordt hier omgezet in style-waarden,
// zodat een taalwissel meteen zichtbaar is zonder herstart.

/** Uitlijning aan de leeskant: links in NL/EN, rechts in het Arabisch. */
export function textStart(isRTL: boolean): TextStyle["textAlign"] {
  return isRTL ? "right" : "left";
}

/** Uitlijning aan de andere kant (bv. een bedrag of tijd achteraan de regel). */
export function textEnd(isRTL: boolean): TextStyle["textAlign"] {
  return isRTL ? "left" : "right";
}

/**
 * Voor rijen waar de volgorde betekenis draagt: icoon + label, chips, een naam
 * met een badge erachter. Gecentreerde of symmetrische rijen hoeven dit niet.
 */
export function row(isRTL: boolean): FlexStyle["flexDirection"] {
  return isRTL ? "row-reverse" : "row";
}

// Iconen die een richting aanwijzen moeten meedraaien; een kalender of een
// prullenbak juist niet.
const GESPIEGELD: Record<string, string> = {
  "chevron-forward": "chevron-back",
  "chevron-back": "chevron-forward",
  "arrow-forward": "arrow-back",
  "arrow-back": "arrow-forward",
  "chevron-forward-outline": "chevron-back-outline",
  "chevron-back-outline": "chevron-forward-outline",
};

export function dirIcon<T extends string>(naam: T, isRTL: boolean): T {
  return isRTL ? ((GESPIEGELD[naam] ?? naam) as T) : naam;
}

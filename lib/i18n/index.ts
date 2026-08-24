import { nl, type Sleutel } from "./nl";
import { ar } from "./ar";
import { en } from "./en";

export type { Sleutel };
export type Lang = "nl" | "ar" | "en";

// De sleutel in lib/storage.ts. Dezelfde naam als op de website, zodat de
// keuze op web niet twee keer gemaakt hoeft te worden.
export const TAAL_SLEUTEL = "jadwal-lang";

export const woordenboeken: Record<Lang, Record<Sleutel, string>> = { nl, ar, en };

// Het label staat in de taal zelf: iemand die geen Nederlands leest moet zijn
// eigen taal kunnen herkennen.
export const TALEN: { code: Lang; label: string; rtl: boolean }[] = [
  { code: "nl", label: "NL", rtl: false },
  { code: "ar", label: "العربية", rtl: true },
  { code: "en", label: "EN", rtl: false },
];

export function isLang(v: unknown): v is Lang {
  return v === "nl" || v === "ar" || v === "en";
}

export function isRtlLang(lang: Lang): boolean {
  return lang === "ar";
}

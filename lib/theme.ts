// Jadwal — Jawharaat design system (ink + terracotta, warme manuscript-tinten).
// Keys ongewijzigd t.o.v. de oude smaragd-set zodat schermcode niet hoeft te wijzigen.
export const colors = {
  primary: "#9D5148",      // terracotta — links, primaire knoppen
  primaryDark: "#8A473F",  // burgundy — hover/pressed
  primaryLight: "#F8E9E8", // blush — tint/badge-achtergrond
  bg: "#FAF7F2",           // bone — paginakleur
  card: "#FFFFFF",
  border: "#E5E5E5",       // hairline
  text: "#020817",         // ink
  textMuted: "#6B6B6B",
  textFaint: "#A8A29E",
  danger: "#9D5148",
  dangerLight: "#F6E4E1",
  warning: "#8A6A2F",
  warningLight: "#F4EEE3",
  info: "#6B6B6B",
  infoLight: "#F3F3F3",
  success: "#8A473F",
  successLight: "#F8E9E8",
};

// Jawharaat-typografie: Plus Jakarta Sans (titels & cijfers) + IBM Plex Sans Arabic (body).
export const fonts = {
  display: "PlusJakartaSans_600SemiBold",
  displayBold: "PlusJakartaSans_700Bold",
  displayMedium: "PlusJakartaSans_500Medium",
  body: "IBMPlexSansArabic_400Regular",
  bodyMedium: "IBMPlexSansArabic_500Medium",
};

// Jawharaat: scherpe hoeken — alleen knoppen krijgen een lichte radius.
export const radius = {
  surface: 0, // cards, inputs, tiles, badges
  button: 6,
};

export const shadows = {
  card: {}, // hairline only — geen schaduw
  input: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  button: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Beheerder",
  DOCENT: "Docent",
  LEERLING: "Leerling",
  OUDER: "Ouder",
};

export const STATUS_LABELS: Record<string, string> = {
  AANWEZIG: "Aanwezig",
  AFWEZIG: "Afwezig",
  TE_LAAT: "Te laat",
  GEOORLOOFD: "Geoorloofd",
};

export const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  AANWEZIG: { bg: colors.successLight, fg: colors.primaryDark },
  AFWEZIG: { bg: colors.dangerLight, fg: colors.danger },
  TE_LAAT: { bg: colors.warningLight, fg: colors.warning },
  GEOORLOOFD: { bg: colors.infoLight, fg: colors.info },
};

export const CATEGORIE_LABELS: Record<string, string> = {
  HIFZ: "Hifdh",
  TAJWEED: "Tajweed",
  ARABISCH: "Arabisch",
  FIQH: "Fiqh",
  SIRA: "Sira",
  OVERIG: "Overig",
};

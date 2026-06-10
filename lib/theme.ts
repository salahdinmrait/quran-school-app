export const colors = {
  primary: "#059669",
  primaryDark: "#047857",
  primaryLight: "#d1fae5",
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
  textFaint: "#94a3b8",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  warning: "#d97706",
  warningLight: "#fef3c7",
  info: "#2563eb",
  infoLight: "#dbeafe",
  success: "#059669",
  successLight: "#d1fae5",
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

// Datums staan overal in de app als dag-maand-jaar, in álle talen en met
// westerse cijfers. Alleen de weekdag- en maandnamen komen uit het
// taalbestand; LanguageContext zet ze hier bij elke taalwissel neer.
let MAANDEN = [
  "jan", "feb", "mrt", "apr", "mei", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

let DAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];

/** Aangeroepen door <LanguageProvider>; buiten die context niet nodig. */
export function setDatumLabels(dagen: string[], maanden: string[]): void {
  if (dagen.length === 7) DAGEN = dagen;
  if (maanden.length === 12) MAANDEN = maanden;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Dag-maand-jaar: DD-MM-YYYY
export function fmtDatum(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// Weergave met weekdag: "wo 23-04-2026". Ook hier het jaartal erbij, zodat
// nergens in de app een datum staat waarvan het jaar geraden moet worden.
export function fmtDatumKort(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${DAGEN[d.getDay()]} ${fmtDatum(d)}`;
}

// Leesbaar met maandnaam: "23 apr 2026" (gebruikt waar context past)
export function fmtDatumLang(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDatumTijd(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${fmtDatum(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Date → "YYYY-MM-DD" for API submission
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

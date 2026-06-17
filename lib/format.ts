const MAANDEN = [
  "jan", "feb", "mrt", "apr", "mei", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

const DAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Nederlandse notatie: DD-MM-YYYY
export function fmtDatum(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// Korte weergave met weekdag: "wo 23-04"
export function fmtDatumKort(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${DAGEN[d.getDay()]} ${pad(d.getDate())}-${pad(d.getMonth() + 1)}`;
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

export function isVerlopen(deadline: string | Date | null | undefined): boolean {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

// Date → "YYYY-MM-DD" for API submission
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Telwoord met correcte enkelvoud/meervoud: plural(1,"docent","docenten") → "1 docent"
export function plural(n: number, enkel: string, meervoud: string): string {
  return `${n} ${n === 1 ? enkel : meervoud}`;
}

// Kalender-helpers voor de agenda (dag/week/maand). Pure datum-rekenkunde.
// De namen komen uit het taalbestand; LanguageContext zet ze hier neer bij
// elke taalwissel, net als in lib/format.ts. De weken beginnen overal op
// maandag, ook in het Arabisch - de school draait op een Nederlands rooster.

let WEEKDAGEN_KORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];

/** De zeven kolomkoppen van de maandweergave, maandag eerst. */
export function weekdagenKort(): string[] {
  return WEEKDAGEN_KORT;
}
let WEEKDAGEN_LANG = [
  "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag",
];
let MAANDEN_LANG = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];
let MAANDEN_KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/**
 * Aangeroepen door <LanguageProvider>. Alle vier de arrays lopen van maandag
 * t/m zondag resp. januari t/m december.
 */
export function setKalenderLabels(
  dagenKort: string[],
  dagenLang: string[],
  maandenLang: string[],
  maandenKort: string[]
): void {
  if (dagenKort.length === 7) WEEKDAGEN_KORT = dagenKort;
  if (dagenLang.length === 7) WEEKDAGEN_LANG = dagenLang;
  if (maandenLang.length === 12) MAANDEN_LANG = maandenLang;
  if (maandenKort.length === 12) MAANDEN_KORT = maandenKort;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Maandag als eerste dag van de week
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // ma=0 ... zo=6
  return addDays(x, -dow);
}

export function weekDays(d: Date): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Een rooster van 6 weken (42 dagen) dat de hele maand omvat, beginnend op maandag
export function monthGrid(d: Date): Date[] {
  const first = startOfMonth(d);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

// "YYYY-MM-DD" sleutel voor groepering
export function dayKey(d: Date | string): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate()
  ).padStart(2, "0")}`;
}

// "maandag 23 april"
export function fmtDagLang(d: Date): string {
  const dow = (d.getDay() + 6) % 7;
  return `${WEEKDAGEN_LANG[dow]} ${d.getDate()} ${MAANDEN_LANG[d.getMonth()]}`;
}

// "april 2026"
export function fmtMaandJaar(d: Date): string {
  return `${MAANDEN_LANG[d.getMonth()]} ${d.getFullYear()}`;
}

// "23 apr"
export function fmtDagKort(d: Date): string {
  return `${d.getDate()} ${MAANDEN_KORT[d.getMonth()]}`;
}

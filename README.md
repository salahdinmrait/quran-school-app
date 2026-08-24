# Jadwal — Mobiele app & webapp (iOS, Android & web)

Expo / React Native app voor Jadwal (voorheen QuranMagister). Draait zowel als
native app (iOS/Android) als webapp (react-native-web, gedeployed op Vercel).
Alle rollen loggen in met hetzelfde schoolaccount:

| Rol | Functionaliteit in de app |
|---|---|
| **Leerling** | Dashboard, huiswerk (incl. bijlagen en docent-opmerkingen), cijfers, rooster (les aantikbaar, met lesdetail), aanwezigheid, berichten naar docenten en beheer, klassement |
| **Docent** | Klassen, huiswerk opgeven vanaf een les (voor de hele klas of voor specifieke leerlingen, met bijlage tot 4 MB) en per leerling aftekenen + opmerking, cijfers invoeren, aanwezigheid registreren vanuit de les, rooster/lessen plannen én per les alles regelen (zie "Het rooster als werkplek"), berichten (klas/ouders/individueel) |
| **Ouder** | Voortgang per kind (cijfers, aanwezigheid), huiswerk meevolgen, rooster, berichten naar docent van het kind |
| **Admin** | Accounts aanmaken binnen de eigen school (incl. telefoonnummer), klassen + koppelingen (leerling/docent/vak), vakken, rooster (lesgegevens wijzigen/verwijderen), berichten |

De rechten zijn identiek op elk platform — de app praat tegen dezelfde API,
de server controleert de rol bij elk verzoek. Er is **geen leeftijdsonderscheid**:
elke leerling heeft precies dezelfde rechten. Wie wat mag, hangt alleen af van de
rol en van de relaties eromheen (eigen klas, eigen kind, eigen school).

> **Dit is de UI-laag.** Alle logica, database, API-routes, e-mail, backups en
> de developer-console zitten in het aparte backend-repo
> [`quran-school-lms`](../quran-school-lms/README.md) — lees dat README voor
> de volledige technische werking (van schoolomgeving aanmaken tot alle
> API-routes, keys en achtergrondtaken). Dit bestand beschrijft alleen wat
> specifiek is aan déze app.

## Configuratie

De app moet weten waar de backend draait. Pas aan in [app.json](app.json):

```json
"extra": { "apiUrl": "https://JOUW-DEPLOYMENT.vercel.app" }
```

Of tijdelijk via een env var bij het starten:

```bash
EXPO_PUBLIC_API_URL=https://jouw-site.vercel.app npx expo start
```

## Ontwikkelen

```bash
npm install
npx expo start
```

Scan de QR-code met de **Expo Go** app (App Store / Play Store) op je telefoon.

## Builds voor de stores

Gebruik [EAS Build](https://docs.expo.dev/build/setup/):

```bash
npm install -g eas-cli
eas login
eas build --platform android   # .aab voor Play Store
eas build --platform ios       # .ipa voor App Store (Apple Developer account nodig)
```

Bundle-identifiers staan al ingesteld: `com.quranmagister.app`.

## Hoe auth werkt

1. App stuurt e-mail + wachtwoord naar `POST /api/mobile/login`
2. Server geeft een JWT (30 dagen geldig) terug
3. Token wordt veilig opgeslagen met `expo-secure-store`
4. Elke API-call stuurt `Authorization: Bearer <token>` mee
5. Is de schoolomgeving gedeactiveerd (via de developer console), dan kan
   niemand van die school meer inloggen
6. Vergeten? `app/wachtwoord-vergeten.tsx` (link onder de inlogknop op
   `app/login.tsx`) stuurt het e-mailadres naar
   `POST /api/auth/forgot-password`; de gebruiker krijgt een link per mail
7. Die link opent **`app/wachtwoord-instellen.tsx`** in de webapp
   (`/wachtwoord-instellen?token=…`) — dus in de huisstijl van de app, niet in
   de LMS. Hetzelfde scherm wordt gebruikt voor de welkomstmail na een
   Excel-import. Na opslaan gaat de gebruiker door naar `app/login.tsx`.
   Werkt op elk apparaat, ook een ander toestel dan waar de app op staat.

## Het rooster als werkplek (`components/LesDetail.tsx`)

In het rooster van de docent (`app/docent/rooster.tsx`), de admin
(`app/admin/rooster.tsx`) én de leerling (`app/leerling/rooster.tsx`) staat bij
een les met huiswerk een badge **HW** (of `HW 3` bij meerdere) — dat aantal komt
mee uit de API als `huiswerkAantal`. Alle drie gebruiken dezelfde helper
`huiswerkBadge()` uit `components/Agenda.tsx`, zodat de regel op één plek staat;
zonder huiswerk verschijnt er niets.

Tikken op een les opent níet meteen een verwijderbevestiging, maar het
lesdetail. Eén gedeelde component, met een `rol`-prop, want huiswerk en
aanwezigheid lopen via docent-only API's:

- **Huiswerk bij deze les** (docent) — lijst met titel, vak en het aantal
  leerlingen dat is afgevinkt, plus per regel een verwijderknop (met
  bevestiging; de bijbehorende `HuiswerkLeerling`- en `Inlevering`-rijen gaan
  in dezelfde transactie mee, en het item verdwijnt meteen bij de leerling).
  Onderaan staat de knop "+ Huiswerk voor deze les" — de **enige** ingang voor
  nieuw huiswerk. Die opent `app/docent/huiswerk-nieuw.tsx` met les, klas en vak
  al ingevuld (via route-params); er is dus geen deadline en geen leskeuze meer
  in het formulier. Wel een keuze **doelgroep**: hele klas of specifieke
  leerlingen (gezocht via de zoekbalk). Bij terugkomst wordt de lijst opnieuw
  opgehaald.
- **Leerlingweergave** — dezelfde component met `rol="LEERLING"`: vak, docent,
  datum, begin- en eindtijd, lokaal, omschrijving, bijlage en het huiswerk van
  die les. Alles alleen-lezen: geen aanwezigheidsknoppen, geen gevarenzone.
- **Aanwezigheid** (docent) — per leerling de vier statussen
  (aanwezig / te laat / geoorloofd / afwezig), direct aantikbaar. De
  registratie gaat optimistisch weg en draait terug bij een fout.
- **Lesgegevens** (docent + admin) — datum, begin- en eindtijd, lokaal,
  omschrijving en de bijlage (toevoegen, openen, weghalen).
- **Les verwijderen** — apart, onderin, in een rode gevarenzone met
  bevestiging. De aanwezigheid van die les gaat mee; huiswerk blijft bestaan
  maar verliest de koppeling met de les.

## Webapp (react-native-web)

Dezelfde codebase draait ook als website
(`https://quran-school-app.vercel.app`), gebouwd met `npx expo export -p web`
en gedeployed op Vercel. `quran-school-app/vercel.json` stuurt alles onder
`/api/**` en `/dev/**` door naar het backend-project
(`quran-school-lms.vercel.app`) — de webapp bevat zelf geen serverlogica.

Vercel bouwt automatisch bij elke push naar `master`; een handmatige export/
deploy-stap is niet nodig.

## Talen: NL / العربية / EN (met echte RTL)

De hele app is drietalig. De taalknop (`components/LanguageButton.tsx`) staat in
de header naast de uitlogknop — bij elke rol — en los op de drie schermen vóór
het inloggen (`login.tsx`, `wachtwoord-vergeten.tsx`, `wachtwoord-instellen.tsx`),
zodat ook iemand die geen Nederlands leest binnenkomt.

- **Geen extra dependency.** `lib/i18n/{nl,ar,en}.ts` +
  `lib/LanguageContext.tsx`, hetzelfde patroon als in het LMS-repo. `nl.ts` is de
  bron van waarheid; `ar.ts` en `en.ts` zijn `Record<Sleutel, string>`, dus een
  vergeten vertaling laat `npx tsc --noEmit` falen.
- **Gebruik:** `const { t, tel, label, isRTL } = useT();` — `t("sleutel", { naam })`
  interpoleert, `tel("c_n_leerlingen", 3)` kiest tussen `_een` en `_meer`, en
  `label("rol" | "status" | "categorie", waarde)` vertaalt API-waarden zoals
  `DOCENT` of `AANWEZIG` (met de ruwe waarde als terugval).
- **Opslag:** `lib/storage.ts`, sleutel `jadwal-lang`. Beginwaarde op web
  `navigator.language`, anders `"nl"`.
- **Richting:** géén `I18nManager.forceRTL` (dat vereist een herstart van de
  native app en doet op web niets zinnigs). In plaats daarvan `isRTL` uit de
  context plus `lib/rtl.ts`: `textStart/textEnd` voor uitlijning, `row(isRTL)`
  voor rijen waar de volgorde betekenis draagt, `dirIcon()` voor pijlen en
  chevrons. Randen en marges gebruiken de logische varianten
  (`borderStartWidth`, `paddingStart`). Op web zet `app/_layout.tsx` bovendien
  `document.documentElement.dir` en `lang` mee.
- **Datums blijven dag-maand-jaar** in alle drie de talen, met westerse cijfers.
  Alleen de weekdag- en maandnamen komen uit het taalbestand:
  `lib/format.ts`, `lib/dates.ts` en `lib/confirm.ts` krijgen hun labels
  doorgegeven door de `LanguageProvider`, zodat ook niet-React-helpers meevertalen.

**Browser-autovertaling voorkomen:** `app.json` zet `web.lang: "nl"`, en
`app/_layout.tsx` zet bij het opstarten op web `translate="no"` + een
`notranslate`-meta-tag op het document (de `lang` zelf volgt nu de gekozen taal).
Zonder dit kan Chrome op een ander toestel UI-tekst per ongeluk gaan
"vertalen" (bv. "rooster" → "haan", "account" → "rekeningen").

## Beperkingen

- Bijlagen uploaden in de app: max **4 MB** (foto/pdf/audio). Grote video's
  (tot 500 MB) upload je via de website (Vercel Blob).
- Bijlagen openen gebeurt in de browser via een beveiligde token-link.

## Volledige systeemdocumentatie

Voor alle API-routes, database-schema, environment-variabelen/keys, de
Excel-bulkimport, e-mail-, backup- en rate-limiting-opzet: zie het
[README van `quran-school-lms`](../quran-school-lms/README.md). Voor de
actuele URL's, wachtwoorden en keys zelf: `Desktop\QuranMagister\PROJECT-SLEUTELS.md`
(bewust niet in git).

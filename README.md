# Jadwal — Mobiele app & webapp (iOS, Android & web)

Expo / React Native app voor Jadwal (voorheen QuranMagister). Draait zowel als
native app (iOS/Android) als webapp (react-native-web, gedeployed op Vercel).
Alle rollen loggen in met hetzelfde schoolaccount:

| Rol | Functionaliteit in de app |
|---|---|
| **Leerling** | Dashboard, huiswerk (incl. bijlagen en docent-opmerkingen), cijfers, rooster, aanwezigheid, berichten (alleen reageren, niet initiëren), klassement |
| **Docent** | Klassen, huiswerk opgeven (met bijlage tot 4 MB) en per leerling aftekenen + opmerking, cijfers invoeren, absentie registreren, rooster/lessen plannen, berichten (klas/ouders/individueel) |
| **Ouder** | Voortgang per kind (cijfers, aanwezigheid), huiswerk meevolgen, rooster, berichten naar docent van het kind |
| **Admin** | Accounts aanmaken binnen de eigen school (incl. telefoonnummer), klassen + koppelingen (leerling/docent/vak), vakken, rooster, berichten |

De rechten zijn identiek op elk platform — de app praat tegen dezelfde API,
de server controleert de rol bij elk verzoek.

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
   `POST /api/auth/forgot-password`; de gebruiker krijgt een reset-link per
   mail (werkt op elk apparaat, ook niet dit toestel — de link opent de
   backend-resetpagina in de browser)

## Webapp (react-native-web)

Dezelfde codebase draait ook als website
(`https://quran-school-app.vercel.app`), gebouwd met `npx expo export -p web`
en gedeployed op Vercel. `quran-school-app/vercel.json` stuurt alles onder
`/api/**` en `/dev/**` door naar het backend-project
(`quran-school-lms.vercel.app`) — de webapp bevat zelf geen serverlogica.

Vercel bouwt automatisch bij elke push naar `master`; een handmatige export/
deploy-stap is niet nodig.

**Browser-autovertaling voorkomen:** `app.json` zet `web.lang: "nl"`, en
`app/_layout.tsx` zet bij het opstarten op web extra `lang="nl"` +
`translate="no"` + een `notranslate`-meta-tag op het document. Zonder dit
kan Chrome op een ander toestel Nederlandse UI-tekst per ongeluk gaan
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

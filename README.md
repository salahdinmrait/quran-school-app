# QuranMagister — Mobiele app (iOS & Android)

Expo / React Native app voor het QuranMagister LMS. Alle rollen loggen in met
hetzelfde schoolaccount als op de website:

| Rol | Functionaliteit in de app |
|---|---|
| **Leerling** | Dashboard, huiswerk (incl. bijlagen en docent-opmerkingen), cijfers, rooster, aanwezigheid, berichten (alleen reageren, niet initiëren), hifdh-voortgang |
| **Docent** | Klassen, huiswerk opgeven (met bijlage tot 4 MB) en per leerling aftekenen + opmerking, cijfers invoeren, absentie registreren, rooster/lessen plannen, berichten (klas/ouders/individueel), hifdh-trajecten beheren en aftekenen |
| **Ouder** | Voortgang per kind (cijfers, aanwezigheid, hifdh), huiswerk meevolgen, rooster, berichten naar docent van het kind |
| **Admin** | Accounts aanmaken binnen de eigen school, klassen + koppelingen (leerling/docent/vak), vakken, rooster, berichten |

De rechten zijn identiek aan de website — de app praat tegen dezelfde API,
de server controleert de rol bij elk verzoek.

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

## Beperkingen

- Bijlagen uploaden in de app: max **4 MB** (foto/pdf/audio). Grote video's
  (tot 500 MB) upload je via de website (Vercel Blob).
- Bijlagen openen gebeurt in de browser via een beveiligde token-link.

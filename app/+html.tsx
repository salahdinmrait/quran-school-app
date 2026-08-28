import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Het HTML-omhulsel van de webversie (alleen web, alleen bij het bouwen).
 *
 * Staat hier vooral om het pictogram op het beginscherm goed te krijgen:
 * zonder <link rel="apple-touch-icon"> maakt Safari zelf een tegel met de
 * eerste letter van de titel, en die verscheen als een donkere "J".
 * Het pictogram moet ondoorzichtig zijn — iOS toont doorzichtige delen zwart
 * en zet er zelf de ronde hoeken op.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="nl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>Jadwal</title>
        <meta name="description" content="Jadwal — rooster, huiswerk en cijfers voor de koranschool." />

        {/* Beginscherm iOS */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Jadwal" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Beginscherm Android + browsertab */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <meta name="theme-color" content="#9D5148" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Voorkomt dat de body meescrollt naast de app zelf. */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: achtergrond }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// De achtergrond staat ook in de body, zodat er bij het overscrollen op iOS
// geen wit randje onder de app vandaan komt.
const achtergrond = `
body { background-color: #FAF7F2; }
@media (prefers-color-scheme: dark) {
  body { background-color: #FAF7F2; }
}
`;

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { getItem, setItem } from "./storage";
import { setDatumLabels } from "./format";
import { setBevestigLabels } from "./confirm";
import { setKalenderLabels } from "./dates";
import {
  TALEN,
  TAAL_SLEUTEL,
  isLang,
  isRtlLang,
  woordenboeken,
  type Lang,
  type Sleutel,
} from "./i18n";

// Eén taalbron voor de hele app. Hetzelfde patroon als op de website
// (lib/i18n.ts + contexts/LanguageContext.tsx daar), zodat er geen tweede
// vertaalsysteem naast het bestaande komt te staan.

type Vars = Record<string, string | number>;

interface TaalContext {
  lang: Lang;
  isRTL: boolean;
  setLang: (l: Lang) => void;
  /** t("c_opslaan") of met variabelen: t("c_nog_anderen_meer", { count: 4 }) */
  t: (sleutel: Sleutel, vars?: Vars) => string;
  /** Enkelvoud/meervoud: tel("c_nog_anderen", 1) → sleutel "c_nog_anderen_een". */
  tel: (basis: string, aantal: number, vars?: Vars) => string;
  /**
   * Label voor een rol, status of vakcategorie zoals die uit de API komt.
   * Onbekende waarden vallen terug op de ruwe waarde, zodat een nieuwe
   * categorie in de database de app niet leeg laat.
   */
  label: (soort: "rol" | "status" | "categorie", waarde: string) => string;
}

const Ctx = createContext<TaalContext | null>(null);

function beginTaal(): Lang {
  // Op web is de browsertaal een betere gok dan "nl"; op native wachten we op
  // de opgeslagen keuze en beginnen we ondertussen in het Nederlands.
  if (Platform.OS === "web" && typeof navigator !== "undefined") {
    const code = (navigator.language || "").slice(0, 2).toLowerCase();
    if (isLang(code)) return code;
  }
  return "nl";
}

function pasWebRichtingToe(lang: Lang) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtlLang(lang) ? "rtl" : "ltr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(beginTaal);

  // De opgeslagen keuze wint van de browsertaal.
  useEffect(() => {
    let levend = true;
    getItem(TAAL_SLEUTEL).then((opgeslagen) => {
      if (levend && isLang(opgeslagen)) setLangState(opgeslagen);
    });
    return () => {
      levend = false;
    };
  }, []);

  // Datumlabels (weekdagen, maandnamen) en de vaste knoppen van de
  // bevestigingsdialoog volgen de taal. De datumnotatie blijft overal
  // dag-maand-jaar met westerse cijfers.
  useEffect(() => {
    const w = woordenboeken[lang];
    setDatumLabels(
      [w.dag_0, w.dag_1, w.dag_2, w.dag_3, w.dag_4, w.dag_5, w.dag_6],
      [w.maand_0, w.maand_1, w.maand_2, w.maand_3, w.maand_4, w.maand_5,
       w.maand_6, w.maand_7, w.maand_8, w.maand_9, w.maand_10, w.maand_11]
    );
    // De agenda rekent met maandag als eerste dag; de sleutels lopen vanaf
    // zondag, dus die schuiven we een plek op.
    setKalenderLabels(
      [w.dag_1, w.dag_2, w.dag_3, w.dag_4, w.dag_5, w.dag_6, w.dag_0],
      [w.dagl_1, w.dagl_2, w.dagl_3, w.dagl_4, w.dagl_5, w.dagl_6, w.dagl_0],
      [w.maandl_0, w.maandl_1, w.maandl_2, w.maandl_3, w.maandl_4, w.maandl_5,
       w.maandl_6, w.maandl_7, w.maandl_8, w.maandl_9, w.maandl_10, w.maandl_11],
      [w.maand_0, w.maand_1, w.maand_2, w.maand_3, w.maand_4, w.maand_5,
       w.maand_6, w.maand_7, w.maand_8, w.maand_9, w.maand_10, w.maand_11]
    );
    setBevestigLabels(w.c_annuleren, w.c_verwijderen);
    pasWebRichtingToe(lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    void setItem(TAAL_SLEUTEL, l);
  }, []);

  const waarde = useMemo<TaalContext>(() => {
    const w = woordenboeken[lang];
    const t = (sleutel: Sleutel, vars?: Vars) => {
      let s = w[sleutel] ?? woordenboeken.nl[sleutel] ?? sleutel;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      }
      return s;
    };
    return {
      lang,
      isRTL: isRtlLang(lang),
      setLang,
      t,
      tel: (basis, aantal, vars) =>
        t(`${basis}${aantal === 1 ? "_een" : "_meer"}` as Sleutel, { count: aantal, ...vars }),
      label: (soort, waarde) => {
        const sleutel = `${soort}_${waarde}` as Sleutel;
        return w[sleutel] ?? woordenboeken.nl[sleutel] ?? waarde;
      },
    };
  }, [lang, setLang]);

  return <Ctx.Provider value={waarde}>{children}</Ctx.Provider>;
}

export function useT(): TaalContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useT() moet binnen <LanguageProvider> gebruikt worden");
  return ctx;
}

export { TALEN };
export type { Lang, Sleutel };

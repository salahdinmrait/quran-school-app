import { Platform, Linking } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File as BestandsInfo } from "expo-file-system";
import { uploadAsync, FileSystemUploadType } from "expo-file-system/legacy";
import { getApiUrl, getAuthToken } from "./api";
import type { Sleutel } from "./i18n";

// Max per bijlage. Het bestand gaat rechtstreeks van het toestel naar de
// opslag (Backblaze B2), niet meer door onze API heen — Vercels limiet van
// ~4,5 MB op een verzoeklichaam speelt dus geen rol meer. 10 MB is ruim
// genoeg voor foto's, pdf's en een audio-inlevering.
export const MAX_BIJLAGE_BYTES = 10 * 1024 * 1024;

export interface GekozenBijlage {
  naam: string;
  url: string; // opslag-URL, na upload
  type: string; // mime
}

interface UploadOpdracht {
  uploadUrl: string;
  headers: Record<string, string>;
  url: string;
}

/**
 * Een mislukte upload met een bruikbare melding erbij.
 *
 * De aanroeper krijgt alleen `sleutel` te zien; `message` bevat de technische
 * reden (statuscode, serverantwoord) en gaat naar de console. Zonder dat laatste
 * is een upload die stukloopt niet te onderscheiden van een die geweigerd wordt.
 */
class UploadFout extends Error {
  sleutel: Sleutel;
  constructor(sleutel: Sleutel, reden: string) {
    super(reden);
    this.sleutel = sleutel;
  }
}

function sleutelBijStatus(status: number, antwoord: string): Sleutel {
  if (status === 401 || status === 403) return "c_upload_geen_toegang";
  if (status === 413) return "c_bestand_te_groot";
  if (status === 429) return "c_te_veel_uploads";
  if (status === 400 && /type/i.test(antwoord)) return "c_bestandstype_niet_toegestaan";
  return "c_upload_mislukt";
}

/**
 * Uploadt één bestand in twee stappen.
 *
 * 1. Onze API keurt naam, type en grootte en geeft een kortlevende PUT-URL
 *    terug plus de definitieve URL van het bestand.
 * 2. Het bestand gaat rechtstreeks naar de opslag.
 *
 * De headers uit stap 1 moeten letterlijk mee: ze zijn meeondertekend, dus
 * een afwijkende `Content-Length` (meer bytes sturen dan opgegeven) laat de
 * opslag de upload weigeren. Dat is precies de bedoeling.
 */
async function uploadBijlage(
  asset: DocumentPicker.DocumentPickerAsset,
  naam: string,
  type: string,
  grootte: number
): Promise<string> {
  const token = getAuthToken();
  const res = await fetch(`${getApiUrl()}/api/bijlage-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ naam, type, grootte }),
  });
  if (!res.ok) {
    const antwoord = await res.text().catch(() => "");
    throw new UploadFout(
      sleutelBijStatus(res.status, antwoord),
      `voorbereiden mislukt (${res.status}) ${antwoord.slice(0, 200)}`
    );
  }
  const opdracht = (await res.json()) as UploadOpdracht;

  if (Platform.OS === "web") {
    if (!asset.file) throw new Error("geen bestand");
    // De browser zet Content-Length zelf op de grootte van het bestand; die
    // handmatig meesturen mag niet en is ook niet nodig.
    let put: Response;
    try {
      put = await fetch(opdracht.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": opdracht.headers["Content-Type"] },
        body: asset.file,
      });
    } catch (err) {
      // Een geweigerde preflight komt hier terecht: de browser geeft geen
      // statuscode, alleen een netwerkfout. Bijna altijd een CORS-regel die de
      // origin van deze webapp niet toestaat.
      throw new UploadFout("c_upload_mislukt", `PUT geblokkeerd (CORS of netwerk): ${String(err)}`);
    }
    if (!put.ok) throw new UploadFout("c_upload_mislukt", `PUT afgewezen (${put.status})`);
  } else {
    const put = await uploadAsync(opdracht.uploadUrl, asset.uri, {
      httpMethod: "PUT",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: opdracht.headers,
    });
    if (put.status < 200 || put.status >= 300) {
      throw new UploadFout("c_upload_mislukt", `PUT afgewezen (${put.status}) ${put.body.slice(0, 200)}`);
    }
  }

  return opdracht.url;
}

// De kiezer geeft de grootte niet altijd mee; zonder die waarde kunnen we niet
// uploaden, want hij wordt meeondertekend in de upload-URL.
function bestandsgrootte(asset: DocumentPicker.DocumentPickerAsset): number | null {
  if (typeof asset.size === "number" && asset.size > 0) return asset.size;
  if (Platform.OS === "web") return asset.file?.size ?? null;
  try {
    const grootte = new BestandsInfo(asset.uri).size;
    return typeof grootte === "number" && grootte > 0 ? grootte : null;
  } catch {
    return null;
  }
}

// Precies de lijst die de server accepteert (ALLOWED_TYPES in
// quran-school-lms/app/api/bijlage-upload/route.ts). De kiezer biedt niets aan
// wat daarna toch geweigerd zou worden. Wijzig ze altijd samen.
const TOEGESTANE_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic",
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/aac", "audio/x-m4a",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

// Sommige browsers (Chrome op Windows bij .heic) en bestandsbeheerders geven
// geen type mee. Dan leiden we het af uit de extensie; de server keurt het
// daarna alsnog.
const TYPE_PER_EXTENSIE: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  webp: "image/webp", heic: "image/heic",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  mp3: "audio/mpeg", m4a: "audio/x-m4a", wav: "audio/wav", ogg: "audio/ogg", aac: "audio/aac",
  pdf: "application/pdf", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

function typeUitNaam(naam: string): string {
  const ext = naam.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_PER_EXTENSIE[ext] ?? "application/octet-stream";
}

// Opent de bestandskiezer en uploadt het gekozen bestand meteen naar de opslag.
// De foutmelding komt terug als vertaalsleutel; het scherm dat dit aanroept
// heeft useT() en zet er de tekst van de gekozen taal bij.
export async function pickBijlage(): Promise<{ bijlage?: GekozenBijlage; fout?: Sleutel }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...TOEGESTANE_TYPES],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return {};
  const asset = result.assets[0];

  const grootte = bestandsgrootte(asset);
  if (grootte === null) return { fout: "c_upload_mislukt" };
  if (grootte > MAX_BIJLAGE_BYTES) return { fout: "c_bestand_te_groot" };

  const naam = asset.name ?? "bijlage";
  const type = asset.mimeType || typeUitNaam(naam);
  try {
    const url = await uploadBijlage(asset, naam, type, grootte);
    return { bijlage: { naam, url, type } };
  } catch (err) {
    // De echte reden hoort niet in de UI, maar moet wél ergens te zien zijn.
    console.error("[bijlage] upload mislukt:", err);
    return { fout: err instanceof UploadFout ? err.sleutel : "c_upload_mislukt" };
  }
}

// Opent een serverbijlage in de browser (met token zodat de download lukt).
export function openAttachment(type: string, id: string) {
  const token = getAuthToken();
  Linking.openURL(`${getApiUrl()}/api/attachment/${type}/${id}?token=${encodeURIComponent(token ?? "")}`);
}

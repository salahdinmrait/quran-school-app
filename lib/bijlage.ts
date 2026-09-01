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
  if (!res.ok) throw new Error(`upload voorbereiden mislukt (${res.status})`);
  const opdracht = (await res.json()) as UploadOpdracht;

  if (Platform.OS === "web") {
    if (!asset.file) throw new Error("geen bestand");
    // De browser zet Content-Length zelf op de grootte van het bestand; die
    // handmatig meesturen mag niet en is ook niet nodig.
    const put = await fetch(opdracht.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": opdracht.headers["Content-Type"] },
      body: asset.file,
    });
    if (!put.ok) throw new Error(`upload mislukt (${put.status})`);
  } else {
    const put = await uploadAsync(opdracht.uploadUrl, asset.uri, {
      httpMethod: "PUT",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: opdracht.headers,
    });
    if (put.status < 200 || put.status >= 300) throw new Error(`upload mislukt (${put.status})`);
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

// Opent de bestandskiezer en uploadt het gekozen bestand meteen naar de opslag.
// De foutmelding komt terug als vertaalsleutel; het scherm dat dit aanroept
// heeft useT() en zet er de tekst van de gekozen taal bij.
export async function pickBijlage(): Promise<{ bijlage?: GekozenBijlage; fout?: Sleutel }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "video/*", "audio/*", "application/pdf", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return {};
  const asset = result.assets[0];

  const grootte = bestandsgrootte(asset);
  if (grootte === null) return { fout: "c_upload_mislukt" };
  if (grootte > MAX_BIJLAGE_BYTES) return { fout: "c_bestand_te_groot" };

  const naam = asset.name ?? "bijlage";
  const type = asset.mimeType ?? "application/octet-stream";
  try {
    const url = await uploadBijlage(asset, naam, type, grootte);
    return { bijlage: { naam, url, type } };
  } catch {
    return { fout: "c_upload_mislukt" };
  }
}

// Opent een serverbijlage in de browser (met token zodat de download lukt).
export function openAttachment(type: string, id: string) {
  const token = getAuthToken();
  Linking.openURL(`${getApiUrl()}/api/attachment/${type}/${id}?token=${encodeURIComponent(token ?? "")}`);
}

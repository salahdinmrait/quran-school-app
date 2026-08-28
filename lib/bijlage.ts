import { Platform, Linking } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { getApiUrl, getAuthToken } from "./api";
import type { Sleutel } from "./i18n";

// Max per bijlage. Gaat ongecodeerd (multipart) naar /api/bijlage-upload, dat
// zelf naar Vercel Blob schrijft — niet meer als base64 in het JSON-verzoek,
// dus de oude grens van "moet onder Vercels 4,5 MB-lichaamslimiet passen na
// ×1,33 base64-opslag" (~3,3 MB) geldt niet meer. 4 MB is ruim genoeg voor
// foto's, pdf's en korte audio-opnames.
export const MAX_BIJLAGE_BYTES = 4 * 1024 * 1024;

export interface GekozenBijlage {
  naam: string;
  url: string; // Vercel Blob-URL, na upload
  type: string; // mime
}

// Upload één bestand naar /api/bijlage-upload en geef de Blob-URL terug.
// Web levert via DocumentPicker een echt File-object (asset.file); native
// levert alleen een uri, en fetch/FormData accepteert daar een
// {uri, name, type}-object voor.
async function uploadBijlage(asset: DocumentPicker.DocumentPickerAsset, naam: string, type: string): Promise<string> {
  const form = new FormData();
  if (Platform.OS === "web" && asset.file) {
    form.append("file", asset.file, naam);
  } else {
    form.append("file", { uri: asset.uri, name: naam, type } as unknown as Blob);
  }

  const token = getAuthToken();
  const res = await fetch(`${getApiUrl()}/api/bijlage-upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) throw new Error(`upload mislukt (${res.status})`);
  const data = (await res.json()) as { url: string };
  return data.url;
}

// Opent de bestandskiezer en uploadt het gekozen bestand meteen naar Blob.
// De foutmelding komt terug als vertaalsleutel; het scherm dat dit aanroept
// heeft useT() en zet er de tekst van de gekozen taal bij.
export async function pickBijlage(): Promise<{ bijlage?: GekozenBijlage; fout?: Sleutel }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "video/*", "audio/*", "application/pdf", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return {};
  const asset = result.assets[0];
  if (asset.size && asset.size > MAX_BIJLAGE_BYTES) {
    return { fout: "c_bestand_te_groot" };
  }
  const naam = asset.name ?? "bijlage";
  const type = asset.mimeType ?? "application/octet-stream";
  try {
    const url = await uploadBijlage(asset, naam, type);
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

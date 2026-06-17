import { Linking } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { getApiUrl, getAuthToken } from "./api";

// Bijlagen in de app gaan als base64 mee in het verzoek; daarom max ±4 MB
// (foto's, pdf's, korte audio). Grote video's gaan via de website.
export const MAX_BIJLAGE_BYTES = 4 * 1024 * 1024;

export interface GekozenBijlage {
  naam: string;
  data: string; // base64
  type: string; // mime
}

// Opent de document-picker en leest het bestand als base64.
// Geeft { error } terug bij een probleem, of { bijlage } bij succes, of {} bij annuleren.
export async function pickBijlage(): Promise<{ bijlage?: GekozenBijlage; error?: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "video/*", "audio/*", "application/pdf", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return {};
  const asset = result.assets[0];
  if (asset.size && asset.size > MAX_BIJLAGE_BYTES) {
    return { error: "Bestand is te groot voor de app (max 4 MB). Gebruik de website voor grote video's." };
  }
  try {
    const data = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
    return {
      bijlage: {
        naam: asset.name ?? "bijlage",
        data,
        type: asset.mimeType ?? "application/octet-stream",
      },
    };
  } catch {
    return { error: "Kon bestand niet lezen." };
  }
}

// Opent een serverbijlage in de browser (met token zodat de download lukt).
export function openAttachment(type: string, id: string) {
  const token = getAuthToken();
  Linking.openURL(`${getApiUrl()}/api/attachment/${type}/${id}?token=${encodeURIComponent(token ?? "")}`);
}

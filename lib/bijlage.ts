import { Platform, Linking } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { getApiUrl, getAuthToken } from "./api";

// Bijlagen gaan als base64 mee in het verzoek; daarom max ±4 MB
// (foto's, pdf's, korte audio). Grote video's gaan via een directe upload elders.
export const MAX_BIJLAGE_BYTES = 4 * 1024 * 1024;

export interface GekozenBijlage {
  naam: string;
  data: string; // base64
  type: string; // mime
}

// Lees een gekozen bestand als base64 — native via expo-file-system, web via FileReader.
async function leesBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result);
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(new Error("Kon bestand niet lezen"));
      reader.readAsDataURL(blob);
    });
  }
  // Native: dynamische require zodat web dit niet hoeft te bundelen
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const FileSystem = require("expo-file-system/legacy");
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

// Opent de bestandskiezer en leest het bestand als base64.
export async function pickBijlage(): Promise<{ bijlage?: GekozenBijlage; error?: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "video/*", "audio/*", "application/pdf", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return {};
  const asset = result.assets[0];
  if (asset.size && asset.size > MAX_BIJLAGE_BYTES) {
    return { error: "Bestand is te groot (max 4 MB)." };
  }
  try {
    const data = await leesBase64(asset.uri);
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

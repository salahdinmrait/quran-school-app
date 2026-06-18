import { Platform } from "react-native";
import Constants from "expo-constants";

// Backend base URL.
// - Web: leeg = relatief = zelfde origin. Vercel proxyt /api naar de backend,
//   zodat de browser geen CORS-probleem heeft.
// - Native (iOS/Android): de absolute backend-URL (EXPO_PUBLIC_API_URL of app.json).
const API_URL: string =
  Platform.OS === "web"
    ? (process.env.EXPO_PUBLIC_API_URL ?? "")
    : (process.env.EXPO_PUBLIC_API_URL ??
       (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
       "http://localhost:3000");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function getApiUrl(): string {
  return API_URL;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });
  } catch {
    throw new ApiError("Geen verbinding met de server", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      (data as { error?: string } | null)?.error ?? `Er ging iets mis (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

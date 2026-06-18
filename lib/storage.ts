import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Cross-platform opslag: SecureStore op native, localStorage op web
// (expo-secure-store werkt niet in de browser).
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null; } catch { return null; }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try { localStorage.setItem(key, value); } catch { /* noop */ }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try { localStorage.removeItem(key); } catch { /* noop */ }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

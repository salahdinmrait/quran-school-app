import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getItem, setItem, deleteItem } from "./storage";
import { api, setAuthToken } from "./api";

export type Role = "ADMIN" | "DOCENT" | "LEERLING" | "OUDER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  schoolId: string | null;
  schoolNaam: string | null;
  isVolwassen?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = "qm_token";
const USER_KEY = "qm_user";

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [token, userJson] = await Promise.all([
          getItem(TOKEN_KEY),
          getItem(USER_KEY),
        ]);
        if (token && userJson) {
          setAuthToken(token);
          setUser(JSON.parse(userJson) as AuthUser);
        }
      } catch {
        // corrupt storage — treat as logged out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ token: string; user: AuthUser }>("/api/mobile/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    await Promise.all([
      setItem(TOKEN_KEY, data.token),
      setItem(USER_KEY, JSON.stringify(data.user)),
    ]);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await Promise.all([
      deleteItem(TOKEN_KEY),
      deleteItem(USER_KEY),
    ]);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import { useT } from "./LanguageContext";

// Simple data-fetching hook: load on mount, pull-to-refresh, manual reload.
export function useFetch<T>(path: string | null) {
  const { t } = useT();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (asRefresh = false) => {
      if (!path) {
        setLoading(false);
        return;
      }
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await api<T>(path);
        if (mounted.current) setData(result);
      } catch (e) {
        if (mounted.current) {
          setError(e instanceof ApiError ? e.message : t("c_er_ging_iets_mis"));
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // t bewust niet in de deps: een taalwissel hoeft geen nieuwe
    // netwerkronde te veroorzaken.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path]
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    setData,
    error,
    loading,
    refreshing,
    reload: () => load(false),
    refresh: () => load(true),
  };
}

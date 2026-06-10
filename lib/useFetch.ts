import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";

// Simple data-fetching hook: load on mount, pull-to-refresh, manual reload.
export function useFetch<T>(path: string | null) {
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
          setError(e instanceof ApiError ? e.message : "Er ging iets mis");
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
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

// ─── hooks/useDashboardData.js ───────────────────────────────────────────────
// Estado de servidor del dashboard con SWR: caché en cliente, deduplicación
// de peticiones y revalidación bajo demanda (mutate). Sustituye a los 8
// useCallback+fetch manuales que vivían en el componente Home.

import { useState, useCallback } from "react";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((r) => r.json());

// Los datos del dashboard cambian poco: sin revalidación al recuperar el foco.
const OPTS = { revalidateOnFocus: false };

export function useGSC() {
  const { data, error, isLoading, mutate } = useSWR("/api/gsc-data", fetcher, OPTS);
  return {
    gscData: data || null,
    gscLoading: isLoading,
    gscError: error ? "Error cargando datos GSC" : "",
    refreshGSC: mutate,
  };
}

export function useArticles() {
  const { data, mutate } = useSWR("/api/articles", fetcher, OPTS);
  return { savedArticles: data?.articles || [], refreshArticles: mutate };
}

export function useScheduled() {
  const { data, mutate } = useSWR("/api/scheduled", fetcher, OPTS);
  return { scheduledArticles: data?.scheduled || [], refreshScheduled: mutate };
}

export function useNextSlot() {
  const { data, mutate } = useSWR("/api/schedule-article", fetcher, OPTS);
  return { nextSlot: data?.nextDate ? data : null, refreshNextSlot: mutate };
}

export function useSyncMeta() {
  const { data, mutate } = useSWR("/api/sync-blog-posts", fetcher, OPTS);
  return { syncMeta: data?.synced ? data : null, refreshSyncMeta: mutate };
}

export function useEvergreen() {
  const { data, isLoading, mutate } = useSWR("/api/evergreen-analysis", fetcher, OPTS);
  return { evergreenData: data || null, evergreenLoading: isLoading, refreshEvergreen: mutate };
}

export function usePsCategories() {
  const { data } = useSWR("/api/prestashop-categories", fetcher, OPTS);
  return { psCategories: data?.categories || [] };
}

export function useWpCategories() {
  const { data } = useSWR("/api/wp-categories", fetcher, OPTS);
  return { wpCategories: Array.isArray(data) ? data : [] };
}

export function usePerformance() {
  const { data, isLoading, mutate } = useSWR("/api/performance", fetcher, OPTS);
  return {
    performanceData: data || null,
    performanceLoading: isLoading,
    refreshPerformance: () => fetch("/api/performance?refresh=true").then((r) => r.json()).then((d) => mutate(d, false)),
  };
}

// Keywords (Prestashop × GSC × Claude): NO se carga en el mount — consume
// tokens. Se dispara manualmente desde el botón "Analizar keywords".
export function useKeywordsData() {
  const [kwData, setKwData] = useState(null);
  const [kwLoading, setKwLoading] = useState(false);

  const fetchKeywords = useCallback(async (forceRefresh = false) => {
    setKwLoading(true);
    try {
      const url = forceRefresh ? "/api/keywords-data?refresh=true" : "/api/keywords-data";
      const res = await fetch(url);
      const data = await res.json();
      setKwData(data);
    } catch {
      // silencioso: el panel muestra su propio estado vacío
    }
    setKwLoading(false);
  }, []);

  return { kwData, kwLoading, fetchKeywords };
}

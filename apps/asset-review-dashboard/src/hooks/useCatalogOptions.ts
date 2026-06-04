import { useCallback, useEffect, useState } from "react";
import { getCatalogOptions } from "../api/catalogsApi";
import type { CatalogOptionsBundle } from "../types/catalogs";
import { normalizeCatalogOptions, staticFallbackOptions } from "../utils/catalogNormalize";

export function useCatalogOptions() {
  const [options, setOptions] = useState<CatalogOptionsBundle>(staticFallbackOptions());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromApi, setFromApi] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getCatalogOptions();
      if (result.ok === false) {
        throw new Error(result.message ?? result.reason ?? "Failed to load catalog options");
      }
      const normalized = normalizeCatalogOptions(result);
      setOptions(normalized);
      setFromApi(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load catalog options";
      setError(message);
      setOptions(staticFallbackOptions());
      setFromApi(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { options, loading, error, fromApi, refresh };
}

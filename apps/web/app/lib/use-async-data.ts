"use client";

import { useCallback, useEffect, useState } from "react";

export interface AsyncData<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Generic data-fetching hook that owns the loading/error/refetch lifecycle, so
 * pages stop hand-rolling the same `load()/try/catch/useEffect` block.
 *
 * @param fetcher returns the data; recreated per render, so memoise via `deps`.
 * @param deps dependency list controlling when a refetch is triggered.
 * @param options.enabled skip fetching until truthy (e.g. an async route param).
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
  options: { enabled?: boolean } = {},
): AsyncData<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetcher());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setLoading(false);
    }
    // fetcher is intentionally excluded; callers control freshness via `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (enabled) void refetch();
  }, [enabled, refetch]);

  return { data, error, loading, refetch };
}

import { useCallback, useEffect, useState } from "react";

type AsyncState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
};

export function useAsyncResource<T>(
  loader: () => Promise<T>,
  dependencies: readonly unknown[],
  enabled = true,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [reloadSeed, setReloadSeed] = useState(0);

  const reload = useCallback(async () => {
    setReloadSeed((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const nextData = await loader();

        if (cancelled) {
          return;
        }

        setData(nextData);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [enabled, loader, reloadSeed, ...dependencies]);

  return {
    data,
    error,
    loading,
    reload,
  };
}

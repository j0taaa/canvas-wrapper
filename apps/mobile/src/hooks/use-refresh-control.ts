import { useCallback, useState } from "react";

export function useRefreshControl(onRefreshAction: () => Promise<unknown> | unknown) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    void Promise.resolve(onRefreshAction()).finally(() => {
      setRefreshing(false);
    });
  }, [onRefreshAction]);

  return { onRefresh, refreshing };
}

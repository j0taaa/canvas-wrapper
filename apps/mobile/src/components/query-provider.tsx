import React, { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { queryClient, asyncStoragePersister } from "../../src/lib/query-client";

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

function BackgroundRefreshHandler() {
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          queryClient.invalidateQueries({
            predicate: (query) => {
              const lastUpdated = query.state.dataUpdatedAt;
              const staleTime = 5 * 60 * 1000;
              return Date.now() - lastUpdated > staleTime;
            },
          });
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 24 * 60 * 60 * 1000,
      }}
    >
      <BackgroundRefreshHandler />
      {children}
    </PersistQueryClientProvider>
  );
}

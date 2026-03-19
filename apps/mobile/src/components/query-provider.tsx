import React, { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { Query } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onlineManager } from "@tanstack/react-query";
import { queryClient, asyncStoragePersister } from "../../src/lib/query-client";

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

function BackgroundRefreshHandler() {
  useEffect(() => {
    void AsyncStorage.removeItem("canvasQueryCache");
  }, []);

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

function shouldPersistQuery(query: Query) {
  const [scope, identifier, detail] = query.queryKey as [unknown, unknown?, unknown?];

  if (scope === "dashboard" || scope === "inbox" || scope === "calendar") {
    return true;
  }

  if (scope === "user" && identifier === "profile") {
    return true;
  }

  if (scope === "course" && (detail === "content" || detail === "grades")) {
    return true;
  }

  return false;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
        },
        persister: asyncStoragePersister,
        maxAge: 24 * 60 * 60 * 1000,
      }}
    >
      <BackgroundRefreshHandler />
      {children}
    </PersistQueryClientProvider>
  );
}

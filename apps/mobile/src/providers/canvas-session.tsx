import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type CanvasClientConfig, normalizeCanvasProviderUrl } from "@canvas/shared";
import { clearCanvasConfig, getStoredCanvasConfig, saveCanvasConfig } from "../lib/canvas-config";
import { clearLocalAccountData } from "../lib/account-cleanup";

type CanvasSessionValue = {
  clearConfig: () => Promise<void>;
  config: CanvasClientConfig | null;
  configured: boolean;
  ready: boolean;
  saveConfig: (input: { apiBase?: string | null; apiKey: string }) => Promise<void>;
};

const CanvasSessionContext = createContext<CanvasSessionValue | null>(null);

export function CanvasSessionProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<CanvasClientConfig | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const storedConfig = await getStoredCanvasConfig();

      if (cancelled) {
        return;
      }

      setConfig(storedConfig);
      setReady(true);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveConfig = useCallback(async (input: { apiBase?: string | null; apiKey: string }) => {
    const nextConfig = await saveCanvasConfig({
      apiBase: normalizeCanvasProviderUrl(input.apiBase),
      apiKey: input.apiKey,
    });

    if (config && (config.apiBase !== nextConfig.apiBase || config.apiKey !== nextConfig.apiKey)) {
      await clearLocalAccountData();
    }

    setConfig(nextConfig);
  }, [config]);

  const handleClearConfig = useCallback(async () => {
    await Promise.all([
      clearCanvasConfig(),
      clearLocalAccountData(),
    ]);
    setConfig(null);
  }, []);

  const value = useMemo<CanvasSessionValue>(() => ({
    clearConfig: handleClearConfig,
    config,
    configured: config != null,
    ready,
    saveConfig: handleSaveConfig,
  }), [config, handleClearConfig, handleSaveConfig, ready]);

  return <CanvasSessionContext.Provider value={value}>{children}</CanvasSessionContext.Provider>;
}

export function useCanvasSession() {
  const context = useContext(CanvasSessionContext);

  if (!context) {
    throw new Error("useCanvasSession must be used within CanvasSessionProvider");
  }

  return context;
}

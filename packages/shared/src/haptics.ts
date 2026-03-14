export const HAPTICS_PREFERENCE_STORAGE_KEY = "canvasHapticsEnabled";
export const HAPTICS_PREFERENCE_COOKIE = "canvasHapticsEnabled";
export const HAPTICS_PREFERENCE_EVENT = "canvas-haptics-preference-changed";
export const HAPTICS_BRIDGE_MESSAGE_TYPE = "canvas-haptics";

export type HapticsBridgePattern = "selection";

export type HapticsBridgeMessage = {
  type: typeof HAPTICS_BRIDGE_MESSAGE_TYPE;
  pattern: HapticsBridgePattern;
};

export function parseHapticsEnabled(value?: string | null) {
  return value === "true";
}

export function createHapticsBridgeMessage(
  pattern: HapticsBridgePattern = "selection",
): HapticsBridgeMessage {
  return {
    type: HAPTICS_BRIDGE_MESSAGE_TYPE,
    pattern,
  };
}

export function isHapticsBridgeMessage(value: unknown): value is HapticsBridgeMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<HapticsBridgeMessage>;

  return candidate.type === HAPTICS_BRIDGE_MESSAGE_TYPE && candidate.pattern === "selection";
}

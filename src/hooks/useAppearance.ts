import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/integrations/api/client";
import {
  Appearance,
  DEFAULT_APPEARANCE,
  SETTING_KEYS,
  applyAppearance,
  cacheAppearance,
  readCachedAppearance,
} from "@/lib/appearance";

/** Loads the global appearance settings and applies them to the document. */
export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(readCachedAppearance);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppearance = useCallback(async () => {
    const { data } = await apiClient
      .from("settings")
      .select("key, value")
      .in("key", [SETTING_KEYS.font, SETTING_KEYS.textSize, SETTING_KEYS.theme]);

    const map = new Map((data ?? []).map((row) => [row.key, row.value]));
    const next: Appearance = {
      font: map.get(SETTING_KEYS.font) ?? DEFAULT_APPEARANCE.font,
      textSize: map.get(SETTING_KEYS.textSize) ?? DEFAULT_APPEARANCE.textSize,
      theme: map.get(SETTING_KEYS.theme) ?? DEFAULT_APPEARANCE.theme,
    };
    setAppearance(next);
    cacheAppearance(next);
    setIsLoading(false);
    return next;
  }, []);

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  useEffect(() => {
    fetchAppearance();
  }, [fetchAppearance]);

  return { appearance, setAppearance, isLoading, refetch: fetchAppearance };
}




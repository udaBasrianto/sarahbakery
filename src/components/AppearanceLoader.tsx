import { useAppearance } from "@/hooks/useAppearance";

/** Applies global appearance settings (font, text size, theme) at runtime. */
export function AppearanceLoader() {
  useAppearance();
  return null;
}

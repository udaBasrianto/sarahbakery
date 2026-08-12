// Appearance presets: Google Fonts, global text size, and theme colors.
// Values are persisted in the global `settings` table and applied at runtime
// by injecting a Google Fonts <link> and overriding CSS variables on :root.

export type FontPreset = {
  id: string;
  label: string;
  description: string;
  display: string;
  body: string;
  /** Google Fonts CSS2 query (families only) */
  googleQuery: string;
};

export const FONT_PRESETS: FontPreset[] = [
  {
    id: "playfair-poppins",
    label: "Playfair Display + Poppins",
    description: "Elegan klasik (default)",
    display: "'Playfair Display', serif",
    body: "'Poppins', sans-serif",
    googleQuery:
      "family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700",
  },
  {
    id: "cormorant-karla",
    label: "Cormorant Garamond + Karla",
    description: "Mewah & lembut",
    display: "'Cormorant Garamond', serif",
    body: "'Karla', sans-serif",
    googleQuery:
      "family=Cormorant+Garamond:wght@400;500;600;700&family=Karla:wght@300;400;500;600;700",
  },
  {
    id: "dmserif-dmsans",
    label: "DM Serif Display + DM Sans",
    description: "Editorial modern",
    display: "'DM Serif Display', serif",
    body: "'DM Sans', sans-serif",
    googleQuery: "family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700",
  },
  {
    id: "lora-nunito",
    label: "Lora + Nunito Sans",
    description: "Hangat & mudah dibaca",
    display: "'Lora', serif",
    body: "'Nunito Sans', sans-serif",
    googleQuery:
      "family=Lora:wght@400;500;600;700&family=Nunito+Sans:wght@300;400;500;600;700",
  },
  {
    id: "spacegrotesk-inter",
    label: "Space Grotesk + Inter",
    description: "Bersih & teknologis",
    display: "'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
    googleQuery:
      "family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700",
  },
  {
    id: "outfit-figtree",
    label: "Outfit + Figtree",
    description: "Ramah & kontemporer",
    display: "'Outfit', sans-serif",
    body: "'Figtree', sans-serif",
    googleQuery:
      "family=Outfit:wght@400;500;600;700&family=Figtree:wght@300;400;500;600;700",
  },
  {
    id: "abril-cabin",
    label: "Abril Fatface + Cabin",
    description: "Berani & artistik",
    display: "'Abril Fatface', serif",
    body: "'Cabin', sans-serif",
    googleQuery: "family=Abril+Fatface&family=Cabin:wght@400;500;600;700",
  },
  {
    id: "bebas-barlow",
    label: "Bebas Neue + Barlow",
    description: "Tegas & promosional",
    display: "'Bebas Neue', sans-serif",
    body: "'Barlow', sans-serif",
    googleQuery: "family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700",
  },
  {
    id: "quicksand-worksans",
    label: "Quicksand + Work Sans",
    description: "Manis & playful",
    display: "'Quicksand', sans-serif",
    body: "'Work Sans', sans-serif",
    googleQuery:
      "family=Quicksand:wght@400;500;600;700&family=Work+Sans:wght@300;400;500;600;700",
  },
  {
    id: "libre-plexsans",
    label: "Libre Baskerville + IBM Plex Sans",
    description: "Formal & terpercaya",
    display: "'Libre Baskerville', serif",
    body: "'IBM Plex Sans', sans-serif",
    googleQuery:
      "family=Libre+Baskerville:wght@400;700&family=IBM+Plex+Sans:wght@300;400;500;600;700",
  },
];

export type TextSizePreset = {
  id: string;
  label: string;
  description: string;
  /** root font-size in px */
  rootPx: number;
};

export const TEXT_SIZE_PRESETS: TextSizePreset[] = [
  { id: "sm", label: "Kecil", description: "Padat, banyak konten", rootPx: 14 },
  { id: "base", label: "Normal", description: "Ukuran standar", rootPx: 16 },
  { id: "lg", label: "Besar", description: "Lebih mudah dibaca", rootPx: 18 },
  { id: "xl", label: "Sangat Besar", description: "Aksesibilitas maksimal", rootPx: 20 },
];

export type ThemePreset = {
  id: string;
  label: string;
  description: string;
  /** hex swatches for the admin preview */
  swatches: string[];
  /** HSL token overrides applied to :root */
  tokens: Record<string, string>;
};

const theme = (
  id: string,
  label: string,
  description: string,
  swatches: string[],
  tokens: Record<string, string>,
): ThemePreset => ({ id, label, description, swatches, tokens });

export const THEME_PRESETS: ThemePreset[] = [
  theme("bakery-warm", "Bakery Warm", "Cream, cokelat, rose (default)", ["#f8f4ee", "#8f5a2b", "#e0724a", "#f1e7dc"], {
    "--background": "35 40% 97%",
    "--foreground": "25 30% 15%",
    "--card": "35 35% 99%",
    "--card-foreground": "25 30% 15%",
    "--popover": "35 35% 99%",
    "--popover-foreground": "25 30% 15%",
    "--primary": "25 60% 35%",
    "--primary-foreground": "35 40% 97%",
    "--secondary": "35 30% 92%",
    "--secondary-foreground": "25 40% 25%",
    "--muted": "35 20% 94%",
    "--muted-foreground": "25 15% 45%",
    "--accent": "15 70% 55%",
    "--accent-foreground": "0 0% 100%",
    "--border": "35 25% 88%",
    "--input": "35 25% 88%",
    "--ring": "25 60% 35%",
  }),
  theme("rose-elegant", "Rose Elegant", "Pink lembut & burgundy", ["#fff7f9", "#8e2a4a", "#e05c86", "#fbe4ec"], {
    "--background": "345 60% 98%",
    "--foreground": "340 30% 18%",
    "--card": "0 0% 100%",
    "--card-foreground": "340 30% 18%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "340 30% 18%",
    "--primary": "340 55% 36%",
    "--primary-foreground": "345 60% 98%",
    "--secondary": "345 45% 94%",
    "--secondary-foreground": "340 40% 28%",
    "--muted": "345 35% 95%",
    "--muted-foreground": "340 15% 45%",
    "--accent": "340 75% 62%",
    "--accent-foreground": "0 0% 100%",
    "--border": "345 30% 90%",
    "--input": "345 30% 90%",
    "--ring": "340 55% 36%",
  }),
  theme("choco-gold", "Choco Gold", "Cokelat pekat & emas", ["#fbf7f0", "#3f2a1d", "#c9971f", "#efe3cf"], {
    "--background": "36 45% 96%",
    "--foreground": "25 40% 12%",
    "--card": "38 40% 99%",
    "--card-foreground": "25 40% 12%",
    "--popover": "38 40% 99%",
    "--popover-foreground": "25 40% 12%",
    "--primary": "25 45% 18%",
    "--primary-foreground": "40 60% 95%",
    "--secondary": "38 40% 90%",
    "--secondary-foreground": "25 40% 20%",
    "--muted": "38 30% 93%",
    "--muted-foreground": "28 15% 42%",
    "--accent": "42 75% 45%",
    "--accent-foreground": "25 40% 12%",
    "--border": "38 30% 87%",
    "--input": "38 30% 87%",
    "--ring": "42 75% 45%",
  }),
  theme("matcha-fresh", "Matcha Fresh", "Hijau segar & krem", ["#f5faf3", "#2f5d3a", "#79b465", "#e2efdd"], {
    "--background": "110 35% 97%",
    "--foreground": "140 30% 14%",
    "--card": "0 0% 100%",
    "--card-foreground": "140 30% 14%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "140 30% 14%",
    "--primary": "140 35% 27%",
    "--primary-foreground": "110 35% 97%",
    "--secondary": "115 30% 92%",
    "--secondary-foreground": "140 30% 22%",
    "--muted": "115 25% 94%",
    "--muted-foreground": "140 12% 42%",
    "--accent": "100 45% 50%",
    "--accent-foreground": "0 0% 100%",
    "--border": "115 25% 88%",
    "--input": "115 25% 88%",
    "--ring": "140 35% 27%",
  }),
  theme("ocean-blue", "Ocean Blue", "Biru laut profesional", ["#f4f8fc", "#123a5e", "#2f8fc0", "#dde9f4"], {
    "--background": "210 45% 98%",
    "--foreground": "215 40% 14%",
    "--card": "0 0% 100%",
    "--card-foreground": "215 40% 14%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "215 40% 14%",
    "--primary": "210 60% 26%",
    "--primary-foreground": "210 45% 98%",
    "--secondary": "210 35% 93%",
    "--secondary-foreground": "215 40% 24%",
    "--muted": "210 30% 95%",
    "--muted-foreground": "215 15% 45%",
    "--accent": "199 65% 47%",
    "--accent-foreground": "0 0% 100%",
    "--border": "210 25% 89%",
    "--input": "210 25% 89%",
    "--ring": "199 65% 47%",
  }),
  theme("lavender-soft", "Lavender Soft", "Ungu pastel modern", ["#f9f7fe", "#4c3a86", "#8f7ae0", "#e8e2fa"], {
    "--background": "260 50% 98%",
    "--foreground": "260 35% 16%",
    "--card": "0 0% 100%",
    "--card-foreground": "260 35% 16%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "260 35% 16%",
    "--primary": "258 40% 38%",
    "--primary-foreground": "260 50% 98%",
    "--secondary": "260 40% 94%",
    "--secondary-foreground": "258 40% 30%",
    "--muted": "260 35% 95%",
    "--muted-foreground": "258 12% 46%",
    "--accent": "258 70% 65%",
    "--accent-foreground": "0 0% 100%",
    "--border": "260 30% 90%",
    "--input": "260 30% 90%",
    "--ring": "258 70% 65%",
  }),
  theme("mono-minimal", "Mono Minimal", "Hitam putih bersih", ["#fafafa", "#111111", "#404040", "#eeeeee"], {
    "--background": "0 0% 99%",
    "--foreground": "0 0% 7%",
    "--card": "0 0% 100%",
    "--card-foreground": "0 0% 7%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "0 0% 7%",
    "--primary": "0 0% 10%",
    "--primary-foreground": "0 0% 99%",
    "--secondary": "0 0% 94%",
    "--secondary-foreground": "0 0% 15%",
    "--muted": "0 0% 96%",
    "--muted-foreground": "0 0% 42%",
    "--accent": "0 0% 25%",
    "--accent-foreground": "0 0% 99%",
    "--border": "0 0% 90%",
    "--input": "0 0% 90%",
    "--ring": "0 0% 10%",
  }),
  theme("sunset-orange", "Sunset Orange", "Oranye ceria & energik", ["#fff8f2", "#9c3d10", "#f4802a", "#fde5d1"], {
    "--background": "28 60% 98%",
    "--foreground": "20 40% 15%",
    "--card": "0 0% 100%",
    "--card-foreground": "20 40% 15%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "20 40% 15%",
    "--primary": "20 70% 34%",
    "--primary-foreground": "28 60% 98%",
    "--secondary": "28 55% 93%",
    "--secondary-foreground": "20 50% 26%",
    "--muted": "28 40% 95%",
    "--muted-foreground": "20 15% 45%",
    "--accent": "26 88% 56%",
    "--accent-foreground": "0 0% 100%",
    "--border": "28 35% 89%",
    "--input": "28 35% 89%",
    "--ring": "26 88% 56%",
  }),
  theme("midnight-dark", "Midnight Dark", "Gelap dengan aksen emas", ["#12131a", "#f0e6d2", "#d8b45a", "#1e2029"], {
    "--background": "230 18% 9%",
    "--foreground": "40 35% 93%",
    "--card": "230 16% 13%",
    "--card-foreground": "40 35% 93%",
    "--popover": "230 16% 13%",
    "--popover-foreground": "40 35% 93%",
    "--primary": "42 60% 60%",
    "--primary-foreground": "230 18% 9%",
    "--secondary": "230 14% 18%",
    "--secondary-foreground": "40 30% 90%",
    "--muted": "230 14% 18%",
    "--muted-foreground": "40 12% 65%",
    "--accent": "42 70% 55%",
    "--accent-foreground": "230 18% 9%",
    "--border": "230 12% 22%",
    "--input": "230 12% 22%",
    "--ring": "42 60% 60%",
  }),
  theme("mint-teal", "Mint Teal", "Teal sejuk & mint", ["#f2fbf9", "#0f4f4a", "#2fb9a4", "#d6f1ea"], {
    "--background": "170 45% 97%",
    "--foreground": "180 35% 13%",
    "--card": "0 0% 100%",
    "--card-foreground": "180 35% 13%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "180 35% 13%",
    "--primary": "176 55% 22%",
    "--primary-foreground": "170 45% 97%",
    "--secondary": "170 35% 92%",
    "--secondary-foreground": "176 45% 24%",
    "--muted": "170 30% 94%",
    "--muted-foreground": "180 12% 42%",
    "--accent": "172 60% 45%",
    "--accent-foreground": "0 0% 100%",
    "--border": "170 25% 88%",
    "--input": "170 25% 88%",
    "--ring": "172 60% 45%",
  }),
];

export const DEFAULT_APPEARANCE = {
  font: FONT_PRESETS[0].id,
  textSize: "base",
  theme: THEME_PRESETS[0].id,
};

export type Appearance = typeof DEFAULT_APPEARANCE;

export const SETTING_KEYS = {
  font: "appearance_font",
  textSize: "appearance_text_size",
  theme: "appearance_theme",
} as const;

export const getFontPreset = (id?: string) =>
  FONT_PRESETS.find((f) => f.id === id) ?? FONT_PRESETS[0];
export const getTextSizePreset = (id?: string) =>
  TEXT_SIZE_PRESETS.find((t) => t.id === id) ?? TEXT_SIZE_PRESETS[1];
export const getThemePreset = (id?: string) =>
  THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];

const FONT_LINK_ID = "appearance-google-font";

export function loadGoogleFont(preset: FontPreset) {
  if (typeof document === "undefined") return;
  const href = `https://fonts.googleapis.com/css2?${preset.googleQuery}&display=swap`;
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

/** Applies fonts, root text size and theme tokens to the document. */
export function applyAppearance(appearance: Partial<Appearance>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const font = getFontPreset(appearance.font);
  loadGoogleFont(font);
  root.style.setProperty("--font-display", font.display);
  root.style.setProperty("--font-body", font.body);

  const size = getTextSizePreset(appearance.textSize);
  root.style.setProperty("font-size", `${size.rootPx}px`);

  const themePreset = getThemePreset(appearance.theme);
  Object.entries(themePreset.tokens).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });
  root.classList.toggle("dark", themePreset.id === "midnight-dark");
}

const STORAGE_KEY = "app-appearance";

export function readCachedAppearance(): Appearance {
  if (typeof localStorage === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) } : DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function cacheAppearance(appearance: Appearance) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    /* ignore */
  }
}

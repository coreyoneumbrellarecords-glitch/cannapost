/**
 * BrandThemeContext.tsx
 * Holds the brand palette extracted from an uploaded media kit / logo.
 * Persists the palette to localStorage so it survives page refreshes.
 * Applies CSS custom property overrides to :root whenever the palette changes.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type ExtractedPalette,
  applyPaletteToRoot,
  resetPaletteOnRoot,
} from "@/lib/colorExtractor";

const STORAGE_KEY = "aura_brand_palette";

interface BrandThemeContextValue {
  palette: ExtractedPalette | null;
  /** Call after a successful logo upload with the extracted palette */
  setPalette: (p: ExtractedPalette | null) => void;
  /** Remove palette and restore default green theme */
  clearPalette: () => void;
}

const BrandThemeContext = createContext<BrandThemeContextValue>({
  palette: null,
  setPalette: () => {},
  clearPalette: () => {},
});

export function BrandThemeProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<ExtractedPalette | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ExtractedPalette) : null;
    } catch {
      return null;
    }
  });

  // Apply palette to root on mount + whenever it changes
  useEffect(() => {
    if (palette) {
      applyPaletteToRoot(palette);
    } else {
      resetPaletteOnRoot();
    }
  }, [palette]);

  const setPalette = useCallback((p: ExtractedPalette | null) => {
    setPaletteState(p);
    if (p) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearPalette = useCallback(() => {
    setPalette(null);
  }, [setPalette]);

  return (
    <BrandThemeContext.Provider value={{ palette, setPalette, clearPalette }}>
      {children}
    </BrandThemeContext.Provider>
  );
}

export function useBrandTheme() {
  return useContext(BrandThemeContext);
}

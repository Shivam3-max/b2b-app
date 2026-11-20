import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Per-phone preferences. Shop details live in Shopify (customer record); these are display choices. */
type Prefs = {
  /** Markup used for "you earn" when a product has no MRP. */
  markup: number;
  /** Prefer MRP for "you earn" when the product has one. */
  useMrp: boolean;
  /** Show "you earn" on product cards. */
  showEarnings: boolean;
  language: 'en' | 'hi';
  recentSearches: string[];
  setMarkup: (n: number) => void;
  setUseMrp: (b: boolean) => void;
  setShowEarnings: (b: boolean) => void;
  setLanguage: (l: 'en' | 'hi') => void;
  addRecent: (q: string) => void;
};

export const usePrefs = create<Prefs>()(
  persist(
    set => ({
      markup: 40,
      useMrp: true,
      showEarnings: true,
      language: 'en',
      recentSearches: [],
      setMarkup: markup => set({ markup: Math.max(5, Math.min(150, Math.round(markup))) }),
      setUseMrp: useMrp => set({ useMrp }),
      setShowEarnings: showEarnings => set({ showEarnings }),
      setLanguage: language => set({ language }),
      addRecent: q =>
        set(s => {
          const v = q.trim();
          if (!v) return s;
          return { recentSearches: [v, ...s.recentSearches.filter(r => r.toLowerCase() !== v.toLowerCase())].slice(0, 8) };
        }),
    }),
    { name: 'b2bstore.prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

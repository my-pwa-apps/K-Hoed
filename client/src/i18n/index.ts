import { create } from "zustand";
import { persist } from "zustand/middleware";
import { en } from "./en";
import { nl } from "./nl";
import type { Translations } from "./en";

// ─── Supported locales ────────────────────────────────────────────────────────

export type Locale = "en" | "nl";

export const LOCALES: Locale[] = ["en", "nl"];

const DICTS: Record<Locale, Translations> = { en, nl };

// ─── Zustand locale store ─────────────────────────────────────────────────────

interface I18nStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<I18nStore>()(
  persist(
    (set) => ({
      locale: detectBrowserLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    { name: "k-hoed-locale" },
  ),
);

function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.startsWith("nl")) return "nl";
  return "en";
}

// ─── Interpolation ────────────────────────────────────────────────────────────
// Supports {key} placeholders: t.lobby.players_one, { count: 3 } → "3 players joined"

export function interp(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

// ─── Pluralisation helper ─────────────────────────────────────────────────────
// Looks up  "key_zero" | "key_one" | "key_other"  from translations

type PluralSuffix = "zero" | "one" | "other";

function pluralSuffix(n: number): PluralSuffix {
  if (n === 0) return "zero";
  if (n === 1) return "one";
  return "other";
}

/** Pick the right plural form from a translation section that has _zero/_one/_other keys. */
export function plural(
  section: Record<string, string>,
  baseKey: string,
  count: number,
  extra?: Record<string, string | number>,
): string {
  const suffix = pluralSuffix(count);
  const key = `${baseKey}_${suffix}`;
  const template = section[key] ?? section[`${baseKey}_other`] ?? key;
  return interp(template, { count, ...extra });
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useI18n() {
  const { locale, setLocale } = useLocaleStore();
  const t = DICTS[locale];
  return { t, locale, setLocale, interp, plural };
}

// ─── Utility: get translation without hook (for non-component code) ──────────

export function getT(): Translations {
  const locale = useLocaleStore.getState().locale;
  return DICTS[locale];
}

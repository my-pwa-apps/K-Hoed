import { create } from "zustand";
import { persist } from "zustand/middleware";
import { en } from "./en";
import { nl } from "./nl";
export const LOCALES = ["en", "nl"];
const DICTS = { en, nl };
export const useLocaleStore = create()(persist((set) => ({
    locale: detectBrowserLocale(),
    setLocale: (locale) => set({ locale }),
}), { name: "k-hoed-locale" }));
function detectBrowserLocale() {
    if (typeof navigator === "undefined")
        return "en";
    const lang = navigator.language?.toLowerCase() ?? "";
    if (lang.startsWith("nl"))
        return "nl";
    return "en";
}
// ─── Interpolation ────────────────────────────────────────────────────────────
// Supports {key} placeholders: t.lobby.players_one, { count: 3 } → "3 players joined"
export function interp(template, params) {
    if (!params)
        return template;
    return template.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? String(params[k]) : `{${k}}`);
}
function pluralSuffix(n) {
    if (n === 0)
        return "zero";
    if (n === 1)
        return "one";
    return "other";
}
/** Pick the right plural form from a translation section that has _zero/_one/_other keys. */
export function plural(section, baseKey, count, extra) {
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
export function getT() {
    const locale = useLocaleStore.getState().locale;
    return DICTS[locale];
}

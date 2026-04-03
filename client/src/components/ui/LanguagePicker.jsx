import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Globe } from "lucide-react";
import { useI18n, LOCALES } from "@/i18n";
export function LanguagePicker({ light = false }) {
    const { locale, setLocale, t } = useI18n();
    return (_jsxs("div", { className: "relative inline-flex items-center gap-1", children: [_jsx(Globe, { size: 14, className: light ? "text-white/60" : "text-gray-400", "aria-hidden": true }), _jsx("select", { value: locale, onChange: (e) => setLocale(e.target.value), "aria-label": t.language.choose, className: `text-sm font-medium appearance-none bg-transparent cursor-pointer pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded
          ${light ? "text-white/80 hover:text-white" : "text-gray-600 hover:text-gray-900"}`, children: LOCALES.map((loc) => (_jsx("option", { value: loc, children: t.language[loc] }, loc))) })] }));
}

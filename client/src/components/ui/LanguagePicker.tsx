import { Globe } from "lucide-react";
import { useI18n, LOCALES, type Locale } from "@/i18n";

interface Props {
  /** Light variant for use on dark backgrounds */
  light?: boolean;
}

export function LanguagePicker({ light = false }: Props) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="relative inline-flex items-center gap-1">
      <Globe
        size={14}
        className={light ? "text-white/60" : "text-gray-400"}
        aria-hidden
      />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t.language.choose}
        className={`text-sm font-medium appearance-none bg-transparent cursor-pointer pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded
          ${light ? "text-white/80 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
      >
        {LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {t.language[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}

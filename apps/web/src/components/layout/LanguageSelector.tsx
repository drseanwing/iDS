import { useI18n } from '../../lib/i18n';
import type { LocaleCode } from '../../lib/i18n';

export function LanguageSelector() {
  const { locale, setLocale, availableLocales } = useI18n();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLocale(e.target.value as LocaleCode);
  }

  return (
    <select
      value={locale}
      onChange={handleChange}
      aria-label="Select language"
      className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {availableLocales.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}

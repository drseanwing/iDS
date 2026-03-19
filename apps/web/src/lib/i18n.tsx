import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import enTranslations from '../locales/en.json';
import esTranslations from '../locales/es.json';
import frTranslations from '../locales/fr.json';

type Translations = Record<string, string>;

const translationMap: Record<string, Translations> = {
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
};

export const availableLocales = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
] as const;

export type LocaleCode = 'en' | 'es' | 'fr';

const STORAGE_KEY = 'opengrade-locale';

function getInitialLocale(): LocaleCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in translationMap) {
      return stored as LocaleCode;
    }
  } catch {
    // localStorage unavailable
  }
  return 'en';
}

function translate(
  locale: LocaleCode,
  key: string,
  defaultValue?: string,
  params?: Record<string, string>,
): string {
  const translations = translationMap[locale] ?? translationMap['en'];
  let result = translations[key] ?? defaultValue ?? key;
  if (params) {
    result = result.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
  }
  return result;
}

interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (key: string, defaultValue?: string, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<LocaleCode>(getInitialLocale);

  const setLocale = useCallback((newLocale: LocaleCode) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const t = useCallback(
    (key: string, defaultValue?: string, params?: Record<string, string>) =>
      translate(locale, key, defaultValue, params),
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return {
    t: ctx.t,
    locale: ctx.locale,
    setLocale: ctx.setLocale,
    availableLocales,
  };
}

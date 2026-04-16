/**
 * @fileoverview Public module exports for i18n/index.
 */
import i18n, {type Resource, type i18n as I18nInstance} from 'i18next';
import {initReactI18next} from 'react-i18next';
import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';
import es from './locales/es.json';

// ---------------------------------------------------------------------------
// Intl.PluralRules polyfill
// Older Android versions (< API 30) ship without Intl.PluralRules.
// i18next v4 requires it for plural resolution. This minimal shim satisfies
// the check without pulling in a heavy polyfill package.
// ---------------------------------------------------------------------------
if (typeof Intl === 'undefined' || typeof Intl.PluralRules === 'undefined') {
  // @ts-expect-error — patching missing global on older Android runtimes
  globalThis.Intl = globalThis.Intl ?? {};
  // @ts-expect-error — minimal PluralRules shim: always returns 'other'
  globalThis.Intl.PluralRules = class PluralRulesShim {
    select(_n: number): Intl.LDMLPluralRule {
      return 'other';
    }
  };
}

export const defaultLanguage = 'pt-BR' as const;

export const availableLanguages = ['pt-BR', 'en-US', 'es'] as const;

export type AppLanguage = (typeof availableLanguages)[number];

export const resources: Resource = {
  'pt-BR': {translation: ptBR},
  'en-US': {translation: enUS},
  es: {translation: es},
};

/**
 * Detects the device language and maps it to a supported locale.
 */
export const detectLanguage = (): AppLanguage => {
  const locale =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().locale
      : defaultLanguage;

  if (availableLanguages.includes(locale as AppLanguage)) {
    return locale as AppLanguage;
  }

  const prefix = locale.split('-')[0];
  if (prefix === 'pt') {
    return 'pt-BR';
  }
  if (prefix === 'en') {
    return 'en-US';
  }
  if (prefix === 'es') {
    return 'es';
  }

  return defaultLanguage;
};

/**
 * Initializes i18next for GovMobile.
 */
export const initI18n = async (): Promise<I18nInstance> => {
  if (i18n.isInitialized) {
    return i18n;
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: detectLanguage(),
    fallbackLng: defaultLanguage,
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
    defaultNS: 'translation',
    ns: ['translation'],
    returnNull: false,
  });

  return i18n;
};

void initI18n();

export {i18n};

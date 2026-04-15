import {useCallback} from 'react';
import {
  availableLanguages,
  defaultLanguage,
  i18n,
  type AppLanguage,
} from './index';

type UseLanguageResult = {
  currentLanguage: AppLanguage;
  changeLanguage: (nextLanguage: AppLanguage) => Promise<void>;
  availableLanguages: readonly AppLanguage[];
};

/**
 * Returns language controls for GovMobile localization.
 */
export const useLanguage = (): UseLanguageResult => {
  const currentLanguage = (
    availableLanguages.includes(i18n.language as AppLanguage)
      ? i18n.language
      : defaultLanguage
  ) as AppLanguage;

  const changeLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    await i18n.changeLanguage(nextLanguage);
  }, []);

  return {
    currentLanguage,
    changeLanguage,
    availableLanguages,
  };
};

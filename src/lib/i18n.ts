import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from '../locales/en.json';
import urTranslation from '../locales/ur.json';

const savedLang = localStorage.getItem('hazri_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      ur: { translation: urTranslation },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export const setAppLanguage = (lang: 'en' | 'ur') => {
  i18n.changeLanguage(lang);
  localStorage.setItem('hazri_language', lang);
  document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
};

// Initialize direction
document.documentElement.dir = savedLang === 'ur' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLang;

export default i18n;
